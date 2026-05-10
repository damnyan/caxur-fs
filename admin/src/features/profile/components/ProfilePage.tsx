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
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const emailInitiateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newEmail: z.string().email('Invalid email address'),
});

const emailVerifySchema = z.object({
  otp: z.string().length(6, 'Verification code must be 6 digits'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type EmailInitiateFormValues = z.infer<typeof emailInitiateSchema>;
type EmailVerifyFormValues = z.infer<typeof emailVerifySchema>;

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isInitiatingEmail, setIsInitiatingEmail] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isWaitingForOtp, setIsWaitingForOtp] = useState(false);

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
    },
  });

  useEffect(() => {
    if (user) {
      resetProfile({
        firstName: user.firstName || '',
        middleName: user.middleName || '',
        lastName: user.lastName || '',
        suffix: user.suffix || '',
        contactNumber: user.contactNumber || '',
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

  const {
    register: registerEmailInitiate,
    handleSubmit: handleEmailInitiateSubmit,
    setError: setEmailInitiateError,
    reset: resetEmailInitiateForm,
    formState: { errors: emailInitiateErrors },
  } = useForm<EmailInitiateFormValues>({
    resolver: zodResolver(emailInitiateSchema),
  });

  const {
    register: registerEmailVerify,
    handleSubmit: handleEmailVerifySubmit,
    setError: setEmailVerifyError,
    reset: resetEmailVerifyForm,
    formState: { errors: emailVerifyErrors },
  } = useForm<EmailVerifyFormValues>({
    resolver: zodResolver(emailVerifySchema),
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
    } catch (error: any) {
      if (!handleApiValidationErrors(error, setProfileError)) {
        toast.error(error?.response?.data?.errors?.[0]?.detail || 'Failed to update profile');
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
    } catch (error: any) {
      if (!handleApiValidationErrors(error, setPasswordError)) {
        toast.error(error?.response?.data?.errors?.[0]?.detail || 'Failed to update password');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const onEmailInitiateSubmit = async (data: EmailInitiateFormValues) => {
    if (data.newEmail === user?.email) {
      setEmailInitiateError('newEmail', { message: 'New email cannot be the same as current email' });
      return;
    }

    setIsInitiatingEmail(true);
    try {
      await apiClient.post('/admin/my/profile/email/initiate', {
        currentPassword: data.currentPassword,
        newEmail: data.newEmail,
      });
      
      setIsWaitingForOtp(true);
      toast.success('Verification code sent to your new email');
    } catch (error: any) {
      if (!handleApiValidationErrors(error, setEmailInitiateError)) {
        toast.error(error?.response?.data?.errors?.[0]?.detail || 'Failed to initiate email change');
      }
    } finally {
      setIsInitiatingEmail(false);
    }
  };

  const onEmailVerifySubmit = async (data: EmailVerifyFormValues) => {
    setIsVerifyingEmail(true);
    try {
      await apiClient.post('/admin/my/profile/email/verify', {
        otp: data.otp,
      });
      
      toast.success('Email updated successfully');
      setIsWaitingForOtp(false);
      resetEmailInitiateForm();
      resetEmailVerifyForm();
      
      // Update user state to reflect new email.
      // Note: A full page reload or refetch might be better depending on the app structure,
      // but if the endpoint succeeds, the next session will use the new email.
      // We can also fetch the updated profile to sync the state perfectly.
      const res = await apiClient.get('/admin/my/profile');
      if (res.data?.data?.attributes?.email) {
        updateUser({ email: res.data.data.attributes.email });
      }
    } catch (error: any) {
      if (!handleApiValidationErrors(error, setEmailVerifyError)) {
        toast.error(error?.response?.data?.errors?.[0]?.detail || 'Failed to verify email change');
      }
    } finally {
      setIsVerifyingEmail(false);
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
          <CardContent className="space-y-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...registerProfile('firstName')} />
                {profileErrors.firstName && <p className="text-sm text-red-500">{profileErrors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name (optional)</Label>
                <Input id="middleName" {...registerProfile('middleName')} />
                {profileErrors.middleName && <p className="text-sm text-red-500">{profileErrors.middleName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...registerProfile('lastName')} />
                {profileErrors.lastName && <p className="text-sm text-red-500">{profileErrors.lastName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="suffix">Suffix (optional)</Label>
                <Input id="suffix" placeholder="e.g. Jr, Sr" {...registerProfile('suffix')} />
                {profileErrors.suffix && <p className="text-sm text-red-500">{profileErrors.suffix.message}</p>}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number (optional)</Label>
              <Input id="contactNumber" {...registerProfile('contactNumber')} />
              {profileErrors.contactNumber && <p className="text-sm text-red-500">{profileErrors.contactNumber.message}</p>}
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
          <CardTitle>Change Email Address</CardTitle>
          <CardDescription>
            Update your account's primary email address. This requires a verification code sent to your new email.
          </CardDescription>
        </CardHeader>
        
        {!isWaitingForOtp ? (
          <form onSubmit={handleEmailInitiateSubmit(onEmailInitiateSubmit)}>
            <CardContent className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Current Email</Label>
                <Input value={user?.email || ''} disabled className="bg-gray-50 dark:bg-gray-900 text-gray-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail">New Email Address</Label>
                <Input id="newEmail" type="email" {...registerEmailInitiate('newEmail')} />
                {emailInitiateErrors.newEmail && <p className="text-sm text-red-500">{emailInitiateErrors.newEmail.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailCurrentPassword">Current Password</Label>
                <PasswordInput id="emailCurrentPassword" {...registerEmailInitiate('currentPassword')} />
                {emailInitiateErrors.currentPassword && <p className="text-sm text-red-500">{emailInitiateErrors.currentPassword.message}</p>}
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
              <Button type="submit" variant="secondary" disabled={isInitiatingEmail}>
                {isInitiatingEmail ? 'Sending Code...' : 'Send Verification Code'}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleEmailVerifySubmit(onEmailVerifySubmit)} autoComplete="off">
            {/* Hidden field to trap aggressive browser autofill */}
            <input type="email" name="email" className="hidden" aria-hidden="true" tabIndex={-1} autoComplete="username" />
            <CardContent className="space-y-4 pb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-md text-sm mb-4">
                We've sent a 6-digit verification code to your new email address. Please enter it below to complete the update.
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input 
                  id="otp" 
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder="123456" 
                  maxLength={6} 
                  autoComplete="one-time-code" 
                  data-1p-ignore="true" 
                  data-lpignore="true"
                  {...registerEmailVerify('otp')} 
                />
                {emailVerifyErrors.otp && <p className="text-sm text-red-500">{emailVerifyErrors.otp.message}</p>}
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl flex gap-2">
              <Button type="submit" variant="default" disabled={isVerifyingEmail}>
                {isVerifyingEmail ? 'Verifying...' : 'Verify & Update Email'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => {
                setIsWaitingForOtp(false);
                resetEmailInitiateForm();
                resetEmailVerifyForm();
              }}>
                Cancel
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Ensure your account is using a long, random password to stay secure.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
          <CardContent className="space-y-4 pb-4">
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
