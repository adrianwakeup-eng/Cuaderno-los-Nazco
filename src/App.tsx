import React, { Suspense, lazy } from 'react';
import { FamilyWelcomeAuthScreen } from './components/auth/FamilyWelcomeAuthScreen';
import { IncomingCallModal } from './components/calls/IncomingCallModal';
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
  const {
    snapshot,
    currentUser,
    activeSection,
    joyBursts,
    incomingCall,
    acceptIncomingCall,
    rejectIncomingCall,
  } = useFamilyApp();

  const incomingCaller = incomingCall
    ? snapshot.members.find((m) => m.id === incomingCall.startedById) ?? {
        id: incomingCall.startedById || 'caller_unknown',
        username: 'familiar',
        name: incomingCall.callerName || 'Familiar Nazco',
        email: '',
        password: '',
        relationship: 'Familia Nazco',
        location: '',
        bio: '',
        role: 'MEMBER' as const,
        status: 'ACTIVE' as const,
        presence: 'ONLINE' as const,
        avatarColor: '#164D32',
        joinedAt: incomingCall.createdAt,
        lastActiveAt: incomingCall.createdAt,
      }
    : null;

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
          </AppShell>
          {/* Mounted outside AppShell so top/bottom navigation bars NEVER cover full-screen calls */}
          <VideoCallOverlay />
          <IncomingCallModal
            caller={incomingCaller}
            mode={incomingCall?.mode ?? 'VIDEO'}
            onAccept={acceptIncomingCall}
            onReject={rejectIncomingCall}
          />
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
