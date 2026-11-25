import React from 'react';
import { AdminPanelView } from './components/admin/AdminPanelView';
import { AlbumsView } from './components/albums/AlbumsView';
import { FamilyWelcomeAuthScreen } from './components/auth/FamilyWelcomeAuthScreen';
import { CallsHubView } from './components/calls/CallsHubView';
import { IncomingCallModal } from './components/calls/IncomingCallModal';
import { VideoCallOverlay } from './components/calls/VideoCallOverlay';
import { FamilyWorldView } from './components/family/FamilyWorldView';
import { FeedView } from './components/feed/FeedView';
import { AppShell } from './components/layout/AppShell';
import { MessengerView } from './components/messenger/MessengerView';
import { ProfileView } from './components/profile/ProfileView';
import { JoyBurstLayer } from './components/shared/JoyBurstLayer';
import { AppearanceProvider } from './context/AppearanceContext';
import { FamilyAppProvider, useFamilyApp } from './context/FamilyAppContext';

interface SectionErrorBoundaryProps {
  sectionKey: string;
  onGoHome: () => void;
  children: React.ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: SectionErrorBoundaryProps) {
    if (prevProps.sectionKey !== this.props.sectionKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="crochet-card mx-auto my-8 max-w-md rounded-3xl p-6 text-center">
          <p className="font-display text-lg font-bold text-forest-800">
            Esta sección necesitó recargarse
          </p>
          <p className="mt-1.5 text-sm text-espresso-700">
            Toca el botón para continuar sin cerrar la aplicación.
          </p>
          <div className="mt-4 flex justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onGoHome();
              }}
              className="btn-yarn-press rounded-full bg-forest-700 px-5 py-2.5 text-sm font-bold text-white"
            >
              Volver al Muro
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-yarn-press rounded-full border border-cotton-300 bg-white px-5 py-2.5 text-sm font-bold text-forest-800"
            >
              Actualizar app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const CuadernoContent: React.FC = () => {
  const {
    snapshot,
    currentUser,
    activeSection,
    setActiveSection,
    joyBursts,
    incomingCall,
    acceptIncomingCall,
    rejectIncomingCall,
  } = useFamilyApp();

  const incomingCaller = incomingCall
    ? snapshot.members.find((m) => m.id === incomingCall.startedById) ?? {
        id: incomingCall.startedById || 'caller_unknown',
        username: 'familiar',
        name: incomingCall.callerName || 'Familiar',
        email: '',
        password: '',
        relationship: 'Familia',
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
            <SectionErrorBoundary
              sectionKey={activeSection}
              onGoHome={() => setActiveSection('FEED')}
            >
              {activeSection === 'FEED' && <FeedView />}
              {activeSection === 'MESSAGES' && <MessengerView />}
              {activeSection === 'CALLS' && <CallsHubView />}
              {activeSection === 'ALBUMS' && <AlbumsView />}
              {activeSection === 'FAMILY' && <FamilyWorldView />}
              {activeSection === 'PROFILE' && <ProfileView />}
              {activeSection === 'ADMIN' && <AdminPanelView />}
            </SectionErrorBoundary>
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
