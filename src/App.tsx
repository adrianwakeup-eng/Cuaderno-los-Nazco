import React, { Suspense, lazy } from 'react';
import { FamilyWelcomeAuthScreen } from './components/auth/FamilyWelcomeAuthScreen';
import { VideoCallOverlay } from './components/calls/VideoCallOverlay';
import { YarnBallLoader } from './components/crochet/CrochetArt';
import { FeedView } from './components/feed/FeedView';
import { AppShell } from './components/layout/AppShell';
import { JoyBurstLayer } from './components/shared/JoyBurstLayer';
import { AppearanceProvider } from './context/AppearanceContext';
import { FamilyAppProvider, useFamilyApp } from './context/FamilyAppContext';

// Code-split secondary sections for lightning-fast mobile loading
const MessengerView = lazy(() =>
  import('./components/messenger/MessengerView').then((m) => ({ default: m.MessengerView }))
);
const CallsHubView = lazy(() =>
  import('./components/calls/CallsHubView').then((m) => ({ default: m.CallsHubView }))
);
const AlbumsView = lazy(() =>
  import('./components/albums/AlbumsView').then((m) => ({ default: m.AlbumsView }))
);
const FamilyWorldView = lazy(() =>
  import('./components/family/FamilyWorldView').then((m) => ({ default: m.FamilyWorldView }))
);
const ProfileView = lazy(() =>
  import('./components/profile/ProfileView').then((m) => ({ default: m.ProfileView }))
);
const AdminPanelView = lazy(() =>
  import('./components/admin/AdminPanelView').then((m) => ({ default: m.AdminPanelView }))
);

const SectionLoader: React.FC = () => (
  <div className="flex min-h-[260px] items-center justify-center">
    <YarnBallLoader size={46} label="Tejiendo esta sección…" />
  </div>
);

const CuadernoContent: React.FC = () => {
  const { currentUser, activeSection, joyBursts } = useFamilyApp();

  return (
    <AppearanceProvider userId={currentUser?.id}>
      {!currentUser ? (
        <>
          <FamilyWelcomeAuthScreen />
          <JoyBurstLayer bursts={joyBursts} />
        </>
      ) : (
        <>
          <AppShell>
            <Suspense fallback={<SectionLoader />}>
              {activeSection === 'FEED' && <FeedView />}
              {activeSection === 'MESSAGES' && <MessengerView />}
              {activeSection === 'CALLS' && <CallsHubView />}
              {activeSection === 'ALBUMS' && <AlbumsView />}
              {activeSection === 'FAMILY' && <FamilyWorldView />}
              {activeSection === 'PROFILE' && <ProfileView />}
              {activeSection === 'ADMIN' && <AdminPanelView />}
            </Suspense>
            <VideoCallOverlay />
          </AppShell>
          <JoyBurstLayer bursts={joyBursts} />
        </>
      )}
    </AppearanceProvider>
  );
};

export const App: React.FC = () => (
  <FamilyAppProvider>
    <CuadernoContent />
  </FamilyAppProvider>
);

export default App;
