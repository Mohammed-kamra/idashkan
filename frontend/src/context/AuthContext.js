import React, { createContext, useState, useContext, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on app load
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));

      // Try to refresh user data from server, but don't fail if it doesn't work
      // This is optional and shouldn't cause logout on failure
      refreshUserProfile().catch((error) => {
        console.log(
          "Profile refresh failed on startup, but keeping user logged in:",
          error.message,
        );
      });
    }

    setLoading(false);
  }, []);

  const refreshUserProfile = async () => {
    try {
      const savedToken = localStorage.getItem("token");
      if (savedToken) {
        const response = await authAPI.getProfile({
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (response.data.success) {
          const updatedUser = response.data.data.user;
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
          console.log("Profile refreshed successfully");
        }
      }
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) {
        logout();
        return;
      }
      if (status === 404) {
        logout();
        return;
      }
      console.error("Error refreshing user profile:", error);
      console.log(
        "Profile refresh failed, but keeping user logged in with existing data",
      );
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      if (response.data.success) {
        const { user, token } = response.data.data;
        setUser(user);
        setToken(token);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  };

  const loginWithGoogle = async (idToken) => {
    try {
      const response = await authAPI.googleLogin(idToken);
      if (response.data.success) {
        const { user, token } = response.data.data;
        setUser(user);
        setToken(token);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error("Google login error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Google sign-in failed",
      };
    }
  };

  /** After Google OAuth redirect (?google_oauth_token= app JWT). */
  const completeSessionWithToken = async (appJwt) => {
    if (!appJwt || typeof appJwt !== "string") {
      return { success: false, message: "Invalid session" };
    }
    try {
      const response = await authAPI.getProfile({
        headers: { Authorization: `Bearer ${appJwt}` },
      });
      if (response.data?.success) {
        const u = response.data.data.user;
        setToken(appJwt);
        setUser(u);
        localStorage.setItem("token", appJwt);
        localStorage.setItem("user", JSON.stringify(u));
        return { success: true };
      }
      logout();
      return {
        success: false,
        message: response.data?.message || "Could not complete sign-in",
      };
    } catch (error) {
      console.error("completeSessionWithToken:", error);
      logout();
      return {
        success: false,
        message:
          error.response?.data?.message || "Could not complete sign-in",
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      if (response.data.success) {
        const { user, token } = response.data.data;
        setUser(user);
        setToken(token);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed",
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const deactivate = async () => {
    try {
      const response = await authAPI.deactivate(getAuthHeaders());
      if (response.data?.success) {
        logout();
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data?.message || "Deactivation failed" };
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Deactivation failed";
      return { success: false, message };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      if (response.data.success) {
        const updatedUser = response.data.data.user;
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error("Update profile error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Update failed",
      };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authAPI.changePassword(
        currentPassword,
        newPassword,
      );
      if (response.data.success) {
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error("Change password error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Password change failed",
      };
    }
  };

  const getAuthHeaders = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithGoogle,
        completeSessionWithToken,
        logout,
        deactivate,
        register,
        updateProfile,
        changePassword,
        getAuthHeaders,
        refreshUserProfile,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
