"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/app/context/authContext";
import { useProfile } from "@/app/context/profileContext";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();

  // Profile form state
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize form with current values
  useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(profile.displayName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim());
      setAvatarUrl(profile.avatarUrl || "");
    }
  }, [isOpen, profile, user]);

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

  // Close and reset
  const handleClose = useCallback(() => {
    setProfileMessage(null);
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
              <h2 className="text-lg font-semibold text-dark dark:text-white">Profile Settings</h2>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
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
              <p className="text-xs text-muted mt-1">Email is managed through your account settings</p>
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
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-border dark:border-darkborder shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium rounded-lg text-dark dark:text-white bg-transparent hover:bg-muted/30 dark:hover:bg-white/5 border border-border dark:border-darkborder transition-colors"
          >
            Cancel
          </button>
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
        </div>
      </div>
    </div>
  );
}

export default ProfileEditModal;