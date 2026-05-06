import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { apiClient, handleApiValidationErrors } from '@/lib/api';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1, 'Last name is required'),
  suffix: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  email: z.string().email('Invalid email address'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    setError: setProfileError,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      middleName: user?.middleName || '',
      lastName: user?.lastName || '',
      suffix: user?.suffix || '',
      contactNumber: user?.contactNumber || '',
      email: user?.email || '',
    },
  });

  // Watch for changes to `user` (e.g. after AdminLayout fetches it) and reset the form
  useEffect(() => {
    if (user) {
      resetProfile({
        firstName: user.firstName || '',
        middleName: user.middleName || '',
        lastName: user.lastName || '',
        suffix: user.suffix || '',
        contactNumber: user.contactNumber || '',
        email: user.email || '',
      });
    }
  }, [user, resetProfile]);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    setError: setPasswordError,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      const response = await apiClient.patch('/admin/my/profile', {
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        suffix: data.suffix || null,
        contactNumber: data.contactNumber || null,
      });
      
      const attrs = response.data.data.attributes;
      updateUser({
        firstName: attrs.firstName,
        middleName: attrs.middleName,
        lastName: attrs.lastName,
        suffix: attrs.suffix,
        contactNumber: attrs.contactNumber,
      });
      
      toast.success('Profile updated successfully');
    } catch (error) {
      if (!handleApiValidationErrors(error, setProfileError)) {
        toast.error('Failed to update profile');
      }
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsUpdatingPassword(true);
    try {
      await apiClient.patch('/admin/my/profile/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      
      toast.success('Password updated successfully');
      resetPasswordForm();
    } catch (error) {
      if (!handleApiValidationErrors(error, setPasswordError)) {
        toast.error('Failed to update password');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your personal account settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your personal details here.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...registerProfile('firstName')} />
                {profileErrors.firstName && <p className="text-sm text-red-500">{profileErrors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input id="middleName" {...registerProfile('middleName')} />
                {profileErrors.middleName && <p className="text-sm text-red-500">{profileErrors.middleName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...registerProfile('lastName')} />
                {profileErrors.lastName && <p className="text-sm text-red-500">{profileErrors.lastName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="suffix">Suffix</Label>
                <Input id="suffix" placeholder="e.g. Jr, Sr" {...registerProfile('suffix')} />
                {profileErrors.suffix && <p className="text-sm text-red-500">{profileErrors.suffix.message}</p>}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input id="contactNumber" {...registerProfile('contactNumber')} />
              {profileErrors.contactNumber && <p className="text-sm text-red-500">{profileErrors.contactNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" {...registerProfile('email')} disabled className="bg-gray-50 dark:bg-gray-900" />
              <p className="text-xs text-gray-500">Email address cannot be changed.</p>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
            <Button type="submit" disabled={isSubmittingProfile}>
              {isSubmittingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Ensure your account is using a long, random password to stay secure.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <PasswordInput id="currentPassword" {...registerPassword('currentPassword')} />
              {passwordErrors.currentPassword && <p className="text-sm text-red-500">{passwordErrors.currentPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <PasswordInput id="newPassword" {...registerPassword('newPassword')} />
              {passwordErrors.newPassword && <p className="text-sm text-red-500">{passwordErrors.newPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <PasswordInput id="confirmPassword" {...registerPassword('confirmPassword')} />
              {passwordErrors.confirmPassword && <p className="text-sm text-red-500">{passwordErrors.confirmPassword.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
            <Button type="submit" variant="secondary" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
