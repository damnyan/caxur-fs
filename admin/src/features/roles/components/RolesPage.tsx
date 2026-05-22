import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function RolesPage() {
  useDocumentTitle('Roles');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = 20;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
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
  const meta = rolesResp?.meta;
  const lastPage = meta ? Math.ceil((meta.total || 0) / (meta.perPage || 20)) : 1;

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
    setConfirmDeleteId(id);
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

      {meta && lastPage > 1 && (
        <div className="mt-4 flex justify-end">
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => {
                    if (page > 1) {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.set('page', (page - 1).toString());
                      setSearchParams(newParams);
                    }
                  }} 
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => {
                if (
                  p === 1 || 
                  p === lastPage || 
                  (p >= page - 1 && p <= page + 1)
                ) {
                  return (
                    <PaginationItem key={p}>
                      <PaginationLink 
                        onClick={() => {
                          const newParams = new URLSearchParams(searchParams);
                          newParams.set('page', p.toString());
                          setSearchParams(newParams);
                        }}
                        isActive={page === p}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (
                  p === page - 2 || 
                  p === page + 2
                ) {
                  return (
                    <PaginationItem key={p}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return null;
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => {
                    if (page < lastPage) {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.set('page', (page + 1).toString());
                      setSearchParams(newParams);
                    }
                  }} 
                  className={page >= lastPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this role? This action cannot be undone and may affect users assigned to this role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => {
                if (confirmDeleteId) {
                  deleteMutation.mutate(confirmDeleteId);
                  setConfirmDeleteId(null);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
