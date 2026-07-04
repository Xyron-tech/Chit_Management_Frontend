import API from './axios';

export const updateProfile = async ({ name, email, imageFile }) => {
  const formData = new FormData();
  if (name) formData.append('name', name);
  if (email) formData.append('email', email);
  if (imageFile) formData.append('image', imageFile);

  const { data } = await API.put('/auth/me/profile-picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteProfilePicture = async () => {
  const { data } = await API.delete('/auth/me/profile-picture');
  return data;
};