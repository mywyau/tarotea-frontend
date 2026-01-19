export const useMe = async () => {

  
  if (!process.client) return undefined;

  const { isAuthenticated, getAccessToken } = await useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const token = await getAccessToken();

  console.log(token);

  if (!token) {
    return null;
  }

  return await $fetch("/api/me", {
    headers: {
      Authorization: `Bearer ${token}`,
      cache: "no-store",
    },
  });
};
