"use client";
import React, { useState, useEffect } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { fetchCurrentUser, updateProfile } from "../../../services/auth.service";

export default function UserAddressCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser().then(data => { setUser(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const updated = await updateProfile(user.id, formData);
      setUser(updated);
      closeModal();
    } catch (error) { console.error(error); }
  };

  if (loading) return <div className="p-5 border border-gray-200 rounded-2xl animate-pulse h-48 bg-gray-50/50" />;

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
        Address
      </h4>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
          <div><p className="mb-2 text-xs text-gray-500">Country</p><p className="text-sm font-medium">{user?.country || "Not set"}</p></div>
          <div><p className="mb-2 text-xs text-gray-500">City/State</p><p className="text-sm font-medium">{user?.city || "Not set"}</p></div>
          <div><p className="mb-2 text-xs text-gray-500">Postal Code</p><p className="text-sm font-medium">{user?.postalCode || "Not set"}</p></div>
          <div><p className="mb-2 text-xs text-gray-500">TAX ID</p><p className="text-sm font-medium">{user?.taxId || "Not set"}</p></div>
        </div>
        <button onClick={openModal} className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 lg:inline-flex lg:w-auto">Edit</button>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-11">
          <form onSubmit={handleSave} className="flex flex-col">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
              <div><Label>Country</Label><Input name="country" defaultValue={user?.country} /></div>
              <div><Label>City/State</Label><Input name="city" defaultValue={user?.city} /></div>
              <div><Label>Postal Code</Label><Input name="postalCode" defaultValue={user?.postalCode} /></div>
              <div><Label>TAX ID</Label><Input name="taxId" defaultValue={user?.taxId} /></div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" type="button" onClick={closeModal}>Close</Button>
              <Button size="sm" type="submit">Save Changes</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}