import { useState, useRef, useMemo } from 'react';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { getPermissions, getRolePermissions } from '../api/roles';
import type { Role, Permission } from '../types';

const roleSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(255, 'Name cannot exceed 255 characters'),
  description: z.string().max(255, 'Description cannot exceed 255 characters').optional().nullable(),
});

export type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    data: RoleFormValues,
    selectedPermissions: Set<string>,
    allPermissions: Permission[],
    initialPermissions: string[],
    setError: UseFormSetError<RoleFormValues>
  ) => void;
  role: Role | null; // null means create mode
  isPending: boolean;
  title: string;
}

export function RoleForm({ open, onOpenChange, onSubmit, role, isPending, title }: RoleFormProps) {
  const [permissionOverrides, setPermissionOverrides] = useState<Set<string> | null>(null);
  const savedPermissionsRef = useRef<Set<string>>(new Set());

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    values: {
      name: role?.name || '',
      description: role?.description || '',
    },
  });

  // Fetch all system permissions
  const { data: allPermissionsResp, isLoading: isLoadingAll } = useQuery({
    queryKey: ['permissions', { 'page[number]': 1, 'page[size]': 100 }],
    queryFn: () => getPermissions(1, 100),
    enabled: open,
  });
  const allPermissions = useMemo(
    () => allPermissionsResp?.data.map((p) => p.attributes) || [],
    [allPermissionsResp]
  );

  // Fetch the current role's permissions
  const { data: rolePermissionsResp, isLoading: isLoadingRole } = useQuery({
    queryKey: ['roles', role?.id, 'permissions'],
    queryFn: () => getRolePermissions(role!.id),
    enabled: open && !!role?.id,
  });
  const rolePermissions = useMemo(
    () => (rolePermissionsResp?.data || []).map((p) => (typeof p === 'string' ? p : p.name)),
    [rolePermissionsResp]
  );

  const selectedPermissions = useMemo(() => {
    if (permissionOverrides !== null) {
      return permissionOverrides;
    }
    if (role?.id) {
      return new Set(rolePermissions);
    }
    return new Set<string>();
  }, [permissionOverrides, role?.id, rolePermissions]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPermissionOverrides(null);
      savedPermissionsRef.current = new Set();
      reset({
        name: role?.name || '',
        description: role?.description || '',
      });
    }
    onOpenChange(nextOpen);
  };

  const handleToggle = (permissionName: string, checked: boolean) => {
    let next = new Set(selectedPermissions);
    if (checked) {
      if (permissionName === '*') {
        savedPermissionsRef.current = new Set(selectedPermissions);
        next.clear();
      }
      next.add(permissionName);
    } else {
      if (permissionName === '*') {
        next = new Set(savedPermissionsRef.current);
        next.delete('*');
      } else {
        next.delete(permissionName);
      }
    }
    setPermissionOverrides(next);
  };

  const handleFormSubmit = (data: RoleFormValues) => {
    onSubmit(data, selectedPermissions, allPermissions, rolePermissions, setError);
  };

  const isLoading = isLoadingAll || (!!role && isLoadingRole);
  const hasSuperAdmin = selectedPermissions.has('*');

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-hidden pt-4">
          {/* Top section: Name and Description */}
          <div className="space-y-4 shrink-0 mb-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" {...register('description')} rows={2} />
              {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
            </div>
          </div>

          {/* Middle section: Permissions */}
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <Label>Permissions</Label>
            <div className="border rounded-md p-4 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4 text-gray-500">Loading permissions...</div>
              ) : (
                <div className="space-y-4">
                  {allPermissions.map((permission) => {
                    const isDisabled = hasSuperAdmin && permission.name !== '*';
                    return (
                      <div key={permission.name} className={`flex items-start space-x-3 transition-opacity ${isDisabled ? 'opacity-40' : ''}`}>
                        <Checkbox
                          id={`perm-${permission.name}`}
                          checked={selectedPermissions.has(permission.name)}
                          disabled={isDisabled}
                          onCheckedChange={(checked: boolean | 'indeterminate') => handleToggle(permission.name, checked === true)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`perm-${permission.name}`}
                            className={`text-sm font-medium leading-none ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {permission.description}
                          </label>
                          {permission.name !== '*' && (
                            <p className={`text-sm font-mono ${isDisabled ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                              {permission.name}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {allPermissions.length === 0 && (
                    <p className="text-gray-500 text-center">No permissions found in the system.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom section: Actions */}
          <div className="flex justify-end pt-4 mt-4 border-t shrink-0">
            <Button type="button" variant="outline" className="mr-2" onClick={() => handleDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isLoading}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
