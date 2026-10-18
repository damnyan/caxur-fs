import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Eye, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDateTime } from '@/lib/utils';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useUsers } from '../api/queries';
import type { UserResource } from '../types';

export default function UsersPage() {
  useDocumentTitle('User Management');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const perPage = Math.max(1, parseInt(searchParams.get('per_page') || '10', 10) || 10);
  const search = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(search);
  const [selectedUser, setSelectedUser] = useState<UserResource | null>(null);

  // Sync debounced search to URL
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== search) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (searchInput.trim()) {
            next.set('search', searchInput.trim());
          } else {
            next.delete('search');
          }
          next.set('page', '1');
          return next;
        });
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput, search, setSearchParams]);

  const { data, isLoading, isError } = useUsers({
    page,
    perPage,
    search: search || undefined,
  });

  const users = data?.data || [];
  const meta = data?.meta;
  const totalPages = meta?.total && meta?.perPage ? Math.ceil(meta.total / meta.perPage) : 1;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', newPage.toString());
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Browse and inspect registered client users.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-card border-border font-mono text-sm"
          />
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-xs uppercase tracking-wider">User</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Email</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Created At</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Updated At</TableHead>
              <TableHead className="text-right font-mono text-xs uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-mono text-sm">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-destructive font-mono text-sm">
                  Failed to load users. Please check server connectivity.
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">No users found</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {search ? 'Try clearing your search query.' : 'Registered users will appear here.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const attrs = user.attributes;
                const fullName = [attrs.firstName, attrs.middleName, attrs.lastName, attrs.suffix]
                  .filter(Boolean)
                  .join(' ') || 'Unnamed User';

                const initials = (attrs.firstName?.[0] || '') + (attrs.lastName?.[0] || 'U');

                return (
                  <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {attrs.facePhotoUrl && (
                            <AvatarImage src={attrs.facePhotoUrl} alt={fullName} />
                          )}
                          <AvatarFallback className="text-xs font-mono">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{fullName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{attrs.email}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDateTime(attrs.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDateTime(attrs.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedUser(user)}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(page - 1)}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={page === p}
                    onClick={() => handlePageChange(p)}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(page + 1)}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* User Details Modal */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {selectedUser.attributes.facePhotoUrl && (
                    <AvatarImage src={selectedUser.attributes.facePhotoUrl} />
                  )}
                  <AvatarFallback className="text-lg font-mono">
                    {(selectedUser.attributes.firstName?.[0] || '') + (selectedUser.attributes.lastName?.[0] || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-base">
                    {[
                      selectedUser.attributes.firstName,
                      selectedUser.attributes.middleName,
                      selectedUser.attributes.lastName,
                      selectedUser.attributes.suffix,
                    ]
                      .filter(Boolean)
                      .join(' ') || 'Unnamed User'}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono">{selectedUser.attributes.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">User ID</p>
                  <p className="font-mono text-xs mt-0.5 break-all">{selectedUser.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Type</p>
                  <p className="font-mono text-xs mt-0.5 uppercase">{selectedUser.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Created At</p>
                  <p className="font-mono text-xs mt-0.5">{formatDateTime(selectedUser.attributes.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Updated At</p>
                  <p className="font-mono text-xs mt-0.5">{formatDateTime(selectedUser.attributes.updatedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
