import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { handleApiValidationErrors } from '@/lib/api';
import { getRoles, createRole, updateRole, deleteRole, attachRolePermissions, detachRolePermissions } from '../api/roles';
import type { Role, Permission } from '../types';
import { RoleForm } from './RoleForm';

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [page] = useState(1);
  const [perPage] = useState(20);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  
  // Track global saving state across multiple mutations
  const [isSaving, setIsSaving] = useState(false);

  const { data: rolesResp, isLoading } = useQuery({
    queryKey: ['roles', page, perPage],
    queryFn: () => getRoles(page, perPage),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      toast.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => {
      toast.error('Failed to delete role');
      console.error('Failed to delete role', error);
    }
  });

  const roles = rolesResp?.data.map((r) => r.attributes) || [];

  const handleCreateSubmit = async (
    data: { name: string; description?: string | null },
    selectedPermissions: Set<string>,
    allPermissions: Permission[],
    _initialPermissions: string[],
    setError: any
  ) => {
    setIsSaving(true);
    try {
      // 1. Create Role
      const created = await createRole(data);
      const newRoleId = created.data.id;

      // 2. Attach Permissions if any
      if (selectedPermissions.size > 0) {
        const toAttach = allPermissions.filter(p => selectedPermissions.has(p.name));
        await attachRolePermissions(newRoleId, toAttach);
      }

      toast.success('Role created successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsAddOpen(false);
    } catch (error) {
      if (!handleApiValidationErrors(error, setError)) {
        toast.error('Failed to create role');
      }
      console.error('Failed to create role', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (
    data: { name: string; description?: string | null },
    selectedPermissions: Set<string>,
    allPermissions: Permission[],
    initialPermissions: string[],
    setError: any
  ) => {
    if (!editRole) return;
    
    setIsSaving(true);
    try {
      // 1. Update Role Details
      await updateRole(editRole.id, { name: data.name, description: data.description });

      // 2. Compute Permission diffs
      const currentNames = new Set(initialPermissions);
      const toAttachNames = Array.from(selectedPermissions).filter(x => !currentNames.has(x));
      const toDetachNames = Array.from(currentNames).filter(x => !selectedPermissions.has(x));

      const toAttach = allPermissions.filter(p => toAttachNames.includes(p.name));
      const toDetach = allPermissions.filter(p => toDetachNames.includes(p.name));

      const promises = [];
      if (toAttach.length > 0) {
        promises.push(attachRolePermissions(editRole.id, toAttach));
      }
      if (toDetach.length > 0) {
        promises.push(detachRolePermissions(editRole.id, toDetach));
      }

      await Promise.all(promises);

      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditRole(null);
    } catch (error) {
      if (!handleApiValidationErrors(error, setError)) {
        toast.error('Failed to update role');
      }
      console.error('Failed to update role', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this role?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage system roles and their associated permissions.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Roles</CardTitle>
          <CardDescription>
            These are the predefined roles available in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    Loading roles...
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No roles found.
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.description}</TableCell>
                    <TableCell>
                      {formatDateTime(role.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit Role & Permissions"
                        onClick={() => setEditRole(role)}
                        className="mr-2"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete Role"
                        onClick={() => handleDelete(role.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Role Modal */}
      <RoleForm
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={handleCreateSubmit}
        role={null}
        isPending={isSaving}
        title="Add New Role"
      />

      {/* Edit Role Modal */}
      {editRole && (
        <RoleForm
          open={!!editRole}
          onOpenChange={(open) => !open && setEditRole(null)}
          onSubmit={handleEditSubmit}
          role={editRole}
          isPending={isSaving}
          title={`Edit Role: ${editRole.name}`}
        />
      )}
    </div>
  );
}
