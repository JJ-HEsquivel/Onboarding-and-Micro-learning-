// =============================================================================
// lib/dataverse-client.mjs
// Autenticacion + llamadas HTTP a la Web API de Dataverse, para reutilizar en
// los scripts. Misma autenticacion que create-tables.mjs (Device Code o az cli).
// No guarda ni imprime ningun token.
// =============================================================================
import 'dotenv/config';
import { PublicClientApplication, LogLevel } from '@azure/msal-node';
import { execSync } from 'node:child_process';

const API_VERSION = 'v9.2';
const DEFAULT_PUBLIC_CLIENT_ID = '51f81489-12ee-4a9e-aaae-a2591f45987d';

/** Lee DATAVERSE_URL del .env o termina el proceso con un mensaje claro. */
export function getDataverseUrl() {
  if (!process.env.DATAVERSE_URL) {
    console.error('\n[ERROR] Falta DATAVERSE_URL en tu archivo .env (carpeta dataverse-schema-tool).\n');
    process.exit(1);
  }
  return process.env.DATAVERSE_URL.replace(/\/+$/, '');
}

async function getTokenWithDeviceCode(dataverseUrl) {
  const pca = new PublicClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID || DEFAULT_PUBLIC_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'organizations'}`,
    },
    system: { loggerOptions: { loggerCallback: () => {}, logLevel: LogLevel.Error } },
  });
  const result = await pca.acquireTokenByDeviceCode({
    scopes: [`${dataverseUrl}/user_impersonation`],
    deviceCodeCallback: (response) => {
      console.log('\n--- INICIO DE SESION REQUERIDO ---');
      console.log(response.message);
      console.log('-----------------------------------\n');
    },
  });
  console.log(`Sesion iniciada como: ${result.account?.username ?? '(cuenta autenticada)'}\n`);
  return result.accessToken;
}

function getTokenWithAzureCli(dataverseUrl) {
  try {
    const out = execSync(`az account get-access-token --resource ${dataverseUrl} --query accessToken -o tsv`, {
      encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const token = out.trim();
    if (!token) throw new Error('az no devolvio token');
    return token;
  } catch (e) {
    throw new Error('No se pudo obtener el token con Azure CLI: ' + (e.stderr?.toString().trim() || e.message));
  }
}

/**
 * Inicia sesion y devuelve una funcion `api(method, path, body?, headers?)`.
 * Reintenta automaticamente si Dataverse limita las peticiones (429/503).
 */
export async function connect(dataverseUrl) {
  const authMode = (process.env.AUTH_MODE || 'device').toLowerCase();
  const token = authMode === 'azcli' ? getTokenWithAzureCli(dataverseUrl) : await getTokenWithDeviceCode(dataverseUrl);
  const base = `${dataverseUrl}/api/data/${API_VERSION}`;

  return async function api(method, path, body, extraHeaders = {}) {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await fetch(`${base}/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
          ...extraHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if ((res.status === 429 || res.status === 503) && attempt < 5) {
        await new Promise((r) => setTimeout(r, (Number(res.headers.get('retry-after')) || 2 * attempt) * 1000));
        continue;
      }
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const err = new Error(`${method} ${path} -> ${res.status} ${data?.error?.message || res.statusText}`);
        err.status = res.status;
        throw err;
      }
      return data;
    }
  };
}
