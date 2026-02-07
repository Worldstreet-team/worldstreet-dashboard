"use client";

import { Button, Label, TextInput, Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { signup } from "../actions";

const AuthRegister = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signup(formData);

    if (result?.success && result?.redirectTo) {
      router.push(result.redirectTo);
      return;
    }

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="name" className="font-semibold">
              Name
            </Label>
          </div>
          <TextInput
            id="name"
            name="name"
            type="text"
            sizing="md"
            className="form-control"
            required
          />
        </div>
        <div className="mb-4">
          <div className="mb-2 block">
            <Label htmlFor="email" className="font-semibold">
              Email Address
            </Label>
          </div>
          <TextInput
            id="email"
            name="email"
            type="email"
            sizing="md"
            className="form-control"
            required
          />
        </div>
        <div className="mb-6">
          <div className="mb-2 block">
            <Label htmlFor="password" className="font-semibold">
              Password
            </Label>
          </div>
          <TextInput
            id="password"
            name="password"
            type="password"
            sizing="md"
            className="form-control"
            required
            minLength={6}
          />
        </div>
        <Button 
          type="submit" 
          color={"primary"} 
          className="w-full rounded-md bg-primary hover:bg-primaryemphasis text-white"
          disabled={loading}
        >
          {loading ? <Spinner size="sm" className="mr-2" /> : null}
          {loading ? "Creating account..." : "Sign Up"}
        </Button>
      </form>
    </>
  )
}

export default AuthRegister
