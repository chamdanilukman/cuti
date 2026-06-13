import React, { Suspense } from 'react';

const AppV1 = React.lazy(() => import('./AppV1'));
const AppV2 = React.lazy(() => import('./AppV2'));

type UiVersion = 'v1' | 'v2';

const getRequestedUiVersion = (): UiVersion => {
  if (typeof window === 'undefined') return 'v2';

  const searchParams = new URLSearchParams(window.location.search);
  const requested = searchParams.get('ui');

  if (requested === 'v1') return 'v1';
  if (requested === 'v2') return 'v2';

  return import.meta.env.VITE_DEFAULT_UI_VERSION === 'v1' ? 'v1' : 'v2';
};

const App: React.FC = () => {
  const uiVersion = getRequestedUiVersion();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
          Memuat aplikasi...
        </div>
      }
    >
      {uiVersion === 'v2' ? <AppV2 /> : <AppV1 />}
    </Suspense>
  );
};

export default App;
