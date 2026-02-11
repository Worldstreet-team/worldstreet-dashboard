"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/app/context/authContext";
import { useProfile } from "@/app/context/profileContext";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "profile" | "password";

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();

  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // Profile form state
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Initialize form with current values
  useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(profile.displayName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim());
      setAvatarUrl(profile.avatarUrl || "");
    }
  }, [isOpen, profile, user]);

  // Reset messages when switching tabs
  useEffect(() => {
    setProfileMessage(null);
    setPasswordMessage(null);
  }, [activeTab]);

  // Handle profile save
  const handleProfileSave = useCallback(async () => {
    if (!displayName.trim()) {
      setProfileMessage({ type: "error", text: "Display name is required" });
      return;
    }

    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const success = await updateProfile({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim(),
      });

      if (success) {
        setProfileMessage({ type: "success", text: "Profile updated successfully" });
        setTimeout(() => setProfileMessage(null), 3000);
      } else {
        setProfileMessage({ type: "error", text: "Failed to update profile" });
      }
    } catch {
      setProfileMessage({ type: "error", text: "An error occurred" });
    } finally {
      setProfileSaving(false);
    }
  }, [displayName, avatarUrl, updateProfile]);

  // Handle password change
  const handlePasswordChange = useCallback(async () => {
    // Validation
    if (!currentPassword) {
      setPasswordMessage({ type: "error", text: "Current password is required" });
      return;
    }
    if (!newPassword) {
      setPasswordMessage({ type: "error", text: "New password is required" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordMessage({ type: "error", text: "New password must be different from current password" });
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setPasswordMessage({ type: "success", text: "Password changed successfully" });
        // Clear form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordMessage(null), 3000);
      } else {
        setPasswordMessage({ type: "error", text: data.message || "Failed to change password" });
      }
    } catch {
      setPasswordMessage({ type: "error", text: "An error occurred" });
    } finally {
      setPasswordSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  // Close and reset
  const handleClose = useCallback(() => {
    setActiveTab("profile");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setProfileMessage(null);
    setPasswordMessage(null);
    onClose();
  }, [onClose]);

  const initials = user
    ? user.firstName.charAt(0).toUpperCase() + user.lastName.charAt(0).toUpperCase()
    : "U";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 dark:border-darkborder shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark dark:text-white">Account Settings</h2>
              <p className="text-xs text-muted">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-muted/30 dark:hover:bg-white/5 transition-colors"
          >
            <Icon icon="tabler:x" className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border dark:border-darkborder px-6 shrink-0">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors -mb-px ${
              activeTab === "profile"
                ? "text-primary border-b-2 border-primary"
                : "text-muted hover:text-dark dark:hover:text-white"
            }`}
          >
            <Icon icon="tabler:user" className="inline-block mr-1.5 -mt-0.5" width={16} />
            Profile
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors -mb-px ${
              activeTab === "password"
                ? "text-primary border-b-2 border-primary"
                : "text-muted hover:text-dark dark:hover:text-white"
            }`}
          >
            <Icon icon="tabler:lock" className="inline-block mr-1.5 -mt-0.5" width={16} />
            Password
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-dark dark:text-white mb-2">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-darkborder bg-white dark:bg-dark text-dark dark:text-white placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label htmlFor="avatarUrl" className="block text-sm font-medium text-dark dark:text-white mb-2">
                  Avatar URL <span className="text-muted font-normal">(optional)</span>
                </label>
                <input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-darkborder bg-white dark:bg-dark text-dark dark:text-white placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <p className="text-xs text-muted mt-1">Leave empty to use your initials</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark dark:text-white mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-darkborder bg-muted/20 dark:bg-white/5 text-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted mt-1">Email cannot be changed</p>
              </div>

              {profileMessage && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    profileMessage.type === "success"
                      ? "bg-success/10 text-success"
                      : "bg-error/10 text-error"
                  }`}
                >
                  {profileMessage.text}
                </div>
              )}
            </div>
          )}

          {/* Password Tab */}
          {activeTab === "password" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-dark dark:text-white mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border border-border dark:border-darkborder bg-white dark:bg-dark text-dark dark:text-white placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark dark:hover:text-white"
                  >
                    <Icon icon={showCurrentPassword ? "tabler:eye-off" : "tabler:eye"} width={18} />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-dark dark:text-white mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border border-border dark:border-darkborder bg-white dark:bg-dark text-dark dark:text-white placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark dark:hover:text-white"
                  >
                    <Icon icon={showNewPassword ? "tabler:eye-off" : "tabler:eye"} width={18} />
                  </button>
                </div>
                <p className="text-xs text-muted mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark dark:text-white mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border border-border dark:border-darkborder bg-white dark:bg-dark text-dark dark:text-white placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark dark:hover:text-white"
                  >
                    <Icon icon={showConfirmPassword ? "tabler:eye-off" : "tabler:eye"} width={18} />
                  </button>
                </div>
              </div>

              {passwordMessage && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    passwordMessage.type === "success"
                      ? "bg-success/10 text-success"
                      : "bg-error/10 text-error"
                  }`}
                >
                  {passwordMessage.text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-border dark:border-darkborder shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium rounded-lg text-dark dark:text-white bg-transparent hover:bg-muted/30 dark:hover:bg-white/5 border border-border dark:border-darkborder transition-colors"
          >
            Cancel
          </button>
          {activeTab === "profile" ? (
            <button
              onClick={handleProfileSave}
              disabled={profileSaving}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {profileSaving ? (
                <>
                  <Icon icon="tabler:loader-2" className="animate-spin" width={16} />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          ) : (
            <button
              onClick={handlePasswordChange}
              disabled={passwordSaving}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {passwordSaving ? (
                <>
                  <Icon icon="tabler:loader-2" className="animate-spin" width={16} />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileEditModal;
