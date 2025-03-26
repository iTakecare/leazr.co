
import { useState, useEffect, useCallback } from "react";
import { fetchAllUsers, updateUserProfile, createUser, deleteUser, UserExtended } from "@/services/userService";

export const useUsers = () => {
  const [users, setUsers] = useState<UserExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await fetchAllUsers();
      setUsers(userData);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors du chargement des utilisateurs");
      console.error("Erreur lors du chargement des utilisateurs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateUser = async (userId: string, userData: Partial<UserExtended>) => {
    const success = await updateUserProfile(userId, userData);
    if (success) {
      loadUsers(); // Recharger la liste après la mise à jour
    }
    return success;
  };

  const addUser = async (userData: { email: string, password: string, role?: string, first_name?: string, last_name?: string, company?: string }) => {
    const success = await createUser(userData);
    if (success) {
      loadUsers(); // Recharger la liste après l'ajout
    }
    return success;
  };

  const removeUser = async (userId: string) => {
    const success = await deleteUser(userId);
    if (success) {
      loadUsers(); // Recharger la liste après la suppression
    }
    return success;
  };

  return {
    users,
    loading,
    error,
    refreshUsers: loadUsers,
    updateUser,
    addUser,
    removeUser
  };
};
