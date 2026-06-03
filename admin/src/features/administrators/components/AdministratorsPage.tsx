import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserPlus, Pencil, Trash2, Mail, ShieldAlert, ShieldCheck, MoreHorizontal, Check, ChevronsUpDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRoles } from '@/features/roles/api/roles';
import { administratorsApi } from '../api/administrators';
import { Checkbox } from '@/components/ui/checkbox';

import { 
  useAdministrators, 
  useCreateAdministrator, 
  useUpdateAdministrator,
  useDeleteAdministrator, 
  useRevokeAdministrator, 
  useRestoreAdministrator, 
  useResendVerification,
  administratorsKeys
} from '../api/queries';
import { handleApiValidationErrors } from '@/lib/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const baseSchema = {
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  suffix: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email('Invalid email address'),
  roleIds: z.array(z.string()).optional(),
};

const createSchema = z.object(baseSchema);
const updateSchema = z.object({
  ...baseSchema,
  email: z.string().email('Invalid email address').optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

export default function AdministratorsPage() {
  useDocumentTitle('Administrators');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState<any | null>(null);
  const [confirmAction, setConfirmAction] = useState<{type: 'restore'|'revoke'|'delete', id: string} | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const roleId = searchParams.get('roleId') || '';

  const [searchInput, setSearchInput] = useState(search);
  const [roleOpen, setRoleOpen] = useState(false);

  useEffect(() => {
    if (search === searchInput) return;

    const timer = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      if (searchInput) {
        newParams.set('search', searchInput);
      } else {
        newParams.delete('search');
      }
      newParams.set('page', '1');
      setSearchParams(newParams);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, search, searchParams, setSearchParams]);

  const queryClient = useQueryClient();
  const { data: response, isLoading } = useAdministrators({
    'page[number]': page,
    'page[size]': 10,
    search: search || undefined,
    roleId: roleId || undefined,
  });
  const administrators = response?.data || [];
  const meta = response?.meta;
  const lastPage = meta ? Math.ceil((meta.total || 0) / (meta.perPage || 10)) : 1;
  
  // Fetch roles for selection
  const { data: rolesResp, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: () => getRoles(1, 100),
  });
  const rolesList = useMemo(() => rolesResp?.data || [], [rolesResp]);

  const createMutation = useCreateAdministrator();
  const updateMutation = useUpdateAdministrator();
  const deleteMutation = useDeleteAdministrator();
  const revokeMutation = useRevokeAdministrator();
  const restoreMutation = useRestoreAdministrator();
  const resendMutation = useResendVerification();

  const { control: controlCreate, register: registerCreate, handleSubmit: handleCreateSubmit, reset: resetCreate, setError: setCreateError, formState: { errors: createErrors } } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { firstName: '', middleName: '', lastName: '', suffix: '', contactNumber: '', email: '', roleIds: [] },
  });

  const { control: controlEdit, register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit, setError: setEditError, formState: { errors: editErrors } } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
  });

  useEffect(() => {
    if (editAdmin) {
      resetEdit({
        firstName: editAdmin.firstName,
        middleName: editAdmin.middleName || '',
        lastName: editAdmin.lastName,
        suffix: editAdmin.suffix || '',
        contactNumber: editAdmin.contactNumber || '',
        email: editAdmin.email,
        roleIds: rolesList.filter((r: any) => editAdmin.roles?.includes(r.attributes.name)).map((r: any) => r.id),
      });
    }
  }, [editAdmin, resetEdit, rolesList]);

  const onCreateSubmit = async (data: CreateFormValues) => {
    const { roleIds, ...adminData } = data;
    createMutation.mutate(adminData, {
      onSuccess: async (createdAdmin) => {
        if (roleIds && roleIds.length > 0) {
          try {
            await administratorsApi.attachRoles(createdAdmin.id, { roleIds });
            queryClient.invalidateQueries({ queryKey: administratorsKeys.lists() });
          } catch {
            toast.error('Admin created but failed to attach roles.');
          }
        }
        toast.success('Administrator created successfully. A verification email has been sent.');
        setIsAddOpen(false);
        resetCreate();
      },
      onError: (error) => {
        const handled = handleApiValidationErrors(error, setCreateError);
        if (!handled) {
          toast.error('Failed to create administrator');
        }
      }
    });
  };

  const onEditSubmit = (data: UpdateFormValues) => {
    if (!editAdmin) return;
    const { roleIds, ...adminData } = data;
    updateMutation.mutate({ id: editAdmin.id, data: adminData as any }, {
      onSuccess: async () => {
        if (roleIds) {
          try {
            const existingRoles = rolesList.filter((r: any) => editAdmin.roles?.includes(r.attributes.name)).map((r: any) => r.id);
            const toAttach = roleIds.filter(id => !existingRoles.includes(id));
            const toDetach = existingRoles.filter(id => !roleIds.includes(id));
            
            if (toDetach.length > 0) await administratorsApi.detachRoles(editAdmin.id, { roleIds: toDetach });
            if (toAttach.length > 0) await administratorsApi.attachRoles(editAdmin.id, { roleIds: toAttach });
            queryClient.invalidateQueries({ queryKey: administratorsKeys.lists() });
          } catch {
            toast.error('Admin updated but failed to sync roles.');
          }
        }
        toast.success('Administrator updated successfully.');
        setEditAdmin(null);
      },
      onError: (error) => {
        const handled = handleApiValidationErrors(error, setEditError);
        if (!handled) {
          toast.error('Failed to update administrator');
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-foreground">Administrators</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Manage your portal administrators.
          </p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger 
            render={
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> Add Administrator
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Administrator</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit(onCreateSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" {...registerCreate('firstName')} />
                  {createErrors.firstName && <p className="text-sm text-red-500">{createErrors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name (optional)</Label>
                  <Input id="middleName" {...registerCreate('middleName')} />
                  {createErrors.middleName && <p className="text-sm text-red-500">{createErrors.middleName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" {...registerCreate('lastName')} />
                  {createErrors.lastName && <p className="text-sm text-red-500">{createErrors.lastName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suffix">Suffix (optional)</Label>
                  <Input id="suffix" {...registerCreate('suffix')} />
                  {createErrors.suffix && <p className="text-sm text-red-500">{createErrors.suffix.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...registerCreate('email')} />
                  {createErrors.email && <p className="text-sm text-red-500">{createErrors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">Contact Number (optional)</Label>
                  <Input id="contactNumber" {...registerCreate('contactNumber')} />
                  {createErrors.contactNumber && <p className="text-sm text-red-500">{createErrors.contactNumber.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Roles (optional)</Label>
                <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                  <Controller
                    control={controlCreate}
                    name="roleIds"
                    render={({ field }) => (
                      <>
                        {isLoadingRoles ? (
                          <span className="text-gray-500 italic text-sm">Loading roles...</span>
                        ) : rolesList.map((role: any) => (
                          <label key={role.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                            <Checkbox 
                              checked={field.value?.includes(role.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                const updated = checked
                                  ? [...current, role.id]
                                  : current.filter((id: string) => id !== role.id);
                                field.onChange(updated);
                              }}
                            />
                            <span>{role.attributes.name}</span>
                          </label>
                        ))}
                        {!isLoadingRoles && rolesList.length === 0 && <span className="text-gray-500 italic text-sm">No roles available</span>}
                      </>
                    )}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Administrator'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editAdmin} onOpenChange={(open) => !open && setEditAdmin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Administrator</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name</Label>
                <Input id="editFirstName" {...registerEdit('firstName')} />
                {editErrors.firstName && <p className="text-sm text-red-500">{editErrors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMiddleName">Middle Name (optional)</Label>
                <Input id="editMiddleName" {...registerEdit('middleName')} />
                {editErrors.middleName && <p className="text-sm text-red-500">{editErrors.middleName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name</Label>
                <Input id="editLastName" {...registerEdit('lastName')} />
                {editErrors.lastName && <p className="text-sm text-red-500">{editErrors.lastName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSuffix">Suffix (optional)</Label>
                <Input id="editSuffix" {...registerEdit('suffix')} />
                {editErrors.suffix && <p className="text-sm text-red-500">{editErrors.suffix.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input id="editEmail" type="email" {...registerEdit('email')} disabled={Boolean(editAdmin?.emailVerifiedAt)} className={editAdmin?.emailVerifiedAt ? "bg-gray-100" : ""} title={editAdmin?.emailVerifiedAt ? "Email cannot be changed after verification" : ""} />
                {editErrors.email && <p className="text-sm text-red-500">{editErrors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editContactNumber">Contact Number (optional)</Label>
                <Input id="editContactNumber" {...registerEdit('contactNumber')} />
                {editErrors.contactNumber && <p className="text-sm text-red-500">{editErrors.contactNumber.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Roles (optional)</Label>
              <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                <Controller
                  control={controlEdit}
                  name="roleIds"
                  render={({ field }) => (
                    <>
                      {isLoadingRoles ? (
                        <span className="text-gray-500 italic text-sm">Loading roles...</span>
                      ) : rolesList.map((role: any) => (
                        <label key={role.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                          <Checkbox 
                            checked={field.value?.includes(role.id)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              const updated = checked
                                ? [...current, role.id]
                                : current.filter((id: string) => id !== role.id);
                              field.onChange(updated);
                            }}
                          />
                          <span>{role.attributes.name}</span>
                        </label>
                      ))}
                    </>
                  )}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9 pr-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <Popover open={roleOpen} onOpenChange={setRoleOpen}>
          <PopoverTrigger 
            render={
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={roleOpen}
                className="w-full sm:w-64 justify-between"
              />
            }
          >
            {roleId
              ? rolesList.find((role: any) => role.id === roleId)?.attributes?.name || "Select role..."
              : "Filter by role..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-full sm:w-64 p-0">
            <Command>
              <CommandInput placeholder="Search role..." />
              <CommandList>
                <CommandEmpty>No role found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('roleId');
                      newParams.set('page', '1');
                      setSearchParams(newParams);
                      setRoleOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !roleId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    All Roles
                  </CommandItem>
                  {rolesList.map((role: any) => (
                    <CommandItem
                      key={role.id}
                      value={role.attributes.name}
                      onSelect={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('roleId', role.id);
                        newParams.set('page', '1');
                        setSearchParams(newParams);
                        setRoleOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          roleId === role.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {role.attributes.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="border border-border rounded-lg bg-card shadow-none overflow-hidden">
        <Table>
          <TableHeader className="bg-[#F4F3EC]/30 dark:bg-[#1E1E1E]/30">
            <TableRow>
              <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Name</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Roles</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Email</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Status</TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Loading administrators...
                </TableCell>
              </TableRow>
            ) : administrators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No administrators found.
                </TableCell>
              </TableRow>
            ) : (
              administrators.map((admin: any) => {
                const isVerified = !!admin.emailVerifiedAt;
                const isRevoked = !!admin.revokedAt;
                
                return (
                  <TableRow key={admin.id} className={isRevoked ? "opacity-60 bg-red-50 dark:bg-red-950/20" : ""}>
                    <TableCell className="font-medium">
                      {admin.firstName} {admin.middleName ? admin.middleName + ' ' : ''}{admin.lastName} {admin.suffix ? admin.suffix : ''}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {admin.roles && admin.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {admin.roles.map((r: string) => (
                            <span key={r} className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-widest bg-[#E1F3FE] text-[#1F6C9F] dark:bg-[#1F6C9F]/20 dark:text-[#E1F3FE]">
                              {r}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic font-mono">No roles</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{admin.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {isRevoked ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-widest bg-[#FDEBEC] text-[#9F2F2D] dark:bg-[#9F2F2D]/20 dark:text-[#FDEBEC] w-fit">
                            Revoked
                          </span>
                        ) : isVerified ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-widest bg-[#EDF3EC] text-[#346538] dark:bg-[#346538]/20 dark:text-[#EDF3EC] w-fit">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-widest bg-[#FBF3DB] text-[#956400] dark:bg-[#956400]/20 dark:text-[#FBF3DB] w-fit">
                            Unverified
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger 
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setEditAdmin(admin)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            
                            {!isVerified && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.preventDefault();
                                  toast.promise(resendMutation.mutateAsync(admin.id), {
                                    loading: 'Sending verification email...',
                                    success: 'Verification email sent!',
                                    error: 'Failed to send verification email'
                                  });
                                }}
                              >
                                <Mail className="mr-2 h-4 w-4" /> Resend Verification
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            {isRevoked ? (
                              <DropdownMenuItem 
                                className="text-green-600 focus:text-green-600"
                                onClick={() => setConfirmAction({ type: 'restore', id: admin.id })}
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" /> Restore Access
                              </DropdownMenuItem>
                            ) : (
                              isVerified && (
                                <DropdownMenuItem 
                                  className="text-orange-600 focus:text-orange-600"
                                  onClick={() => setConfirmAction({ type: 'revoke', id: admin.id })}
                                >
                                  <ShieldAlert className="mr-2 h-4 w-4" /> Revoke Access
                                </DropdownMenuItem>
                              )
                            )}
                            
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              onClick={() => setConfirmAction({ type: 'delete', id: admin.id })}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
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
                // Show ellipsis if too many pages
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

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'restore' && 'Restore Administrator'}
              {confirmAction?.type === 'revoke' && 'Revoke Access'}
              {confirmAction?.type === 'delete' && 'Delete Administrator'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'restore' && 'Are you sure you want to restore access for this administrator?'}
              {confirmAction?.type === 'revoke' && 'Are you sure you want to revoke access? The administrator will no longer be able to log in.'}
              {confirmAction?.type === 'delete' && 'Are you sure you want to permanently delete this administrator? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmAction?.type === 'delete' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600' :
                confirmAction?.type === 'revoke' ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-600' :
                'bg-green-600 hover:bg-green-700 focus:ring-green-600'
              }
              onClick={() => {
                if (!confirmAction) return;
                switch (confirmAction.type) {
                  case 'restore':
                    restoreMutation.mutate(confirmAction.id, {
                      onSuccess: () => toast.success('Administrator restored')
                    });
                    break;
                  case 'revoke':
                    revokeMutation.mutate(confirmAction.id, {
                      onSuccess: () => toast.success('Administrator revoked')
                    });
                    break;
                  case 'delete':
                    deleteMutation.mutate(confirmAction.id, {
                      onSuccess: () => toast.success('Administrator deleted')
                    });
                    break;
                }
                setConfirmAction(null);
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
