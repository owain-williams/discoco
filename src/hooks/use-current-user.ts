import { useUser } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";

const createOrUpdateUser = async (userData: {
  clerkId: string;
  email: string;
  username: string;
  imageUrl?: string | null;
}) => {
  const response = await fetch("/api/user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    throw new Error("Failed to create/update user");
  }

  return response.json();
};

export const useCurrentUser = () => {
  const { user, isLoaded } = useUser();

  const { mutate: syncUser } = useMutation({
    mutationFn: createOrUpdateUser,
    onError: (error) => {
      console.error("Failed to sync user:", error);
    },
  });

  // Sync user to database when loaded
  if (isLoaded && user) {
    syncUser({
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress || "",
      username: user.username || user.fullName || "User",
      imageUrl: user.imageUrl,
    });
  }

  return { user, isLoaded };
};
