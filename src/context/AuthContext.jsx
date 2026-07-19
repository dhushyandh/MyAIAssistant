import React, { createContext, useContext, useState, useEffect } from "react";
import { ClerkProvider, SignedIn as ClerkSignedIn, SignedOut as ClerkSignedOut, UserButton as ClerkUserButton, useUser as useClerkUser, useAuth as useClerkAuth } from "@clerk/clerk-react";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

const MockAuthContext = createContext(null);

// Custom Mock Auth Provider
export function MockAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user was previously logged in
    const storedUser = localStorage.getItem("Airo_demo_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    const demoUser = {
      id: "user_demo_123456",
      firstName: userData.firstName || "Guest",
      lastName: userData.lastName || "Explorer",
      fullName: `${userData.firstName || "Guest"} ${userData.lastName || "Explorer"}`,
      primaryEmailAddress: { emailAddress: userData.email || "guest@dhushyandh.me" },
      imageUrl: userData.imageUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
    };
    setUser(demoUser);
    localStorage.setItem("Airo_demo_user", JSON.stringify(demoUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("Airo_demo_user");
  };

  return (
    <MockAuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </MockAuthContext.Provider>
  );
}

// Unified Authenticated Checks
export function SignedIn({ children }) {
  if (CLERK_PUBLISHABLE_KEY) {
    return <ClerkSignedIn>{children}</ClerkSignedIn>;
  } else {
    const { user, loading } = useContext(MockAuthContext);
    if (loading) return null;
    return user ? <>{children}</> : null;
  }
}

export function SignedOut({ children }) {
  if (CLERK_PUBLISHABLE_KEY) {
    return <ClerkSignedOut>{children}</ClerkSignedOut>;
  } else {
    const { user, loading } = useContext(MockAuthContext);
    if (loading) return null;
    return !user ? <>{children}</> : null;
  }
}

// Unified Hooks
export function useUser() {
  if (CLERK_PUBLISHABLE_KEY) {
    const { isLoaded, isSignedIn, user } = useClerkUser();
    return { isLoaded, isSignedIn, user };
  } else {
    const { user, loading } = useContext(MockAuthContext);
    return {
      isLoaded: !loading,
      isSignedIn: !!user,
      user: user,
    };
  }
}

export function useAuth() {
  if (CLERK_PUBLISHABLE_KEY) {
    const { isLoaded, userId, signOut, getToken } = useClerkAuth();
    return { isLoaded, userId, signOut, getToken, isDemo: false };
  } else {
    const { user, loading, logout } = useContext(MockAuthContext);
    return {
      isLoaded: !loading,
      userId: user?.id || null,
      signOut: logout,
      getToken: () => Promise.resolve("mock-token"),
      isDemo: true,
    };
  }
}

export function useMockAuthActions() {
  return useContext(MockAuthContext);
}

// Wrap Provider
export function AuthProvider({ children }) {
  if (CLERK_PUBLISHABLE_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        {children}
      </ClerkProvider>
    );
  } else {
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }
}
