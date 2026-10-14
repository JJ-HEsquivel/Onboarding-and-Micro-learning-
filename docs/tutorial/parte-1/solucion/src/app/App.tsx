import { RouterProvider } from 'react-router';
import { SessionProvider } from './session/SessionProvider';
import { router } from './router';

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}
