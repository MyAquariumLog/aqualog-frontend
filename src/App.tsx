import { BrowserRouter, Route, Routes } from 'react-router'
import { Button, Stack, Text, Title } from '@mantine/core'
import { Suspense, lazy, useEffect, type ReactNode } from 'react'
import { useAuth } from 'react-oidc-context'
import { Shell } from './components/Shell'
import { ConfigErrorPage } from './pages/ConfigErrorPage'
import { config, isConfigured } from './config'
import { AuthTokenBridge } from './auth/OidcProvider'
import { toAuthFailureGuidance } from './auth/authErrorMessaging'

const AuthCallbackPage = lazy(() =>
  import('./pages/AuthCallbackPage').then((module) => ({ default: module.AuthCallbackPage })),
)

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)

const CalculatorPage = lazy(() =>
  import('./pages/CalculatorPage').then((module) => ({ default: module.CalculatorPage })),
)

const AquariumsPage = lazy(() =>
  import('./pages/AquariumsPage').then((module) => ({ default: module.AquariumsPage })),
)

const AquariumDetailPage = lazy(() =>
  import('./pages/AquariumDetailPage').then((module) => ({ default: module.AquariumDetailPage })),
)

const MeasurementsPage = lazy(() =>
  import('./pages/MeasurementsPage').then((module) => ({ default: module.MeasurementsPage })),
)

const JournalPage = lazy(() =>
  import('./pages/JournalPage').then((module) => ({ default: module.JournalPage })),
)

const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })),
)

const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)

export default function App() {
  if (!isConfigured()) {
    return <ConfigErrorPage />
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<AuthStatus title="Loading" body="Loading application..." />}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<AuthGate />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function AuthGate() {
  return config.authMode === 'none' ? <OpenAuthenticatedApp /> : <OidcAuthenticatedApp />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/calculator" element={<CalculatorPage />} />
      <Route path="/aquariums" element={<AquariumsPage />} />
      <Route path="/aquariums/:id" element={<AquariumDetailPage />} />
      <Route path="/measurements" element={<MeasurementsPage />} />
      <Route path="/journal" element={<JournalPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function OpenAuthenticatedApp() {
  return (
    <Shell>
      <AppRoutes />
    </Shell>
  )
}

function OidcAuthenticatedApp() {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator) {
      void auth.signinRedirect()
    }
  }, [auth])

  if (
    auth.isLoading ||
    auth.activeNavigator === 'signinRedirect' ||
    auth.activeNavigator === 'signinSilent' ||
    auth.activeNavigator === 'signoutRedirect'
  ) {
    return <AuthStatus title="Checking your session" body="Authenticating with provider..." />
  }

  if (auth.error) {
    return (
      <AuthStatus
        title="Authentication failed"
        body={toAuthFailureGuidance(auth.error.message)}
        action={
          <Button onClick={() => void auth.signinRedirect()}>
            Sign in again
          </Button>
        }
      />
    )
  }

  if (!auth.isAuthenticated) {
    return <AuthStatus title="Redirecting" body="Sending you to sign in..." />
  }

  return (
    <>
      <AuthTokenBridge />
      <Shell>
        <AppRoutes />
      </Shell>
    </>
  )
}

interface AuthStatusProps {
  title: string
  body: string
  action?: ReactNode
}

function AuthStatus({ title, body, action }: AuthStatusProps) {
  return (
    <Stack gap="md" maw={480} mx="auto" mt="xl" px="md">
      <Title order={3}>{title}</Title>
      <Text c="dimmed" size="sm">
        {body}
      </Text>
      {action}
    </Stack>
  )
}
