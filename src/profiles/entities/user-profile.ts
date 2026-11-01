import { randomUUID } from 'node:crypto';
import { CreateUserProfileDto } from '../dto/create-user-profile.dto.js';

export interface GeoPoint { lat: number; lon: number; }
export interface SocialLink { platform: string; url: string; }

export interface UserProfile {
  id: string; // uuid
  username: string;
  email: string;
  fullName: string;
  bio: string;
  birthDate: string; // ISO date
  gender: string;
  city: string;
  country: string;
  location: GeoPoint;
  interests: string[];
  socialLinks: SocialLink[];
  profilePictureUrl: string;
  isPrivate: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export function newUserProfile(dto: CreateUserProfileDto): UserProfile {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    username: dto.username,
    email: dto.email,
    fullName: dto.fullName,
    bio: dto.bio ?? '',
    birthDate: '',
    gender: '',
    city: dto.city ?? '',
    country: dto.country ?? '',
    location: { lat: 0, lon: 0 },
    interests: dto.interests ?? [],
    socialLinks: [],
    profilePictureUrl: '',
    isPrivate: dto.isPrivate ?? false,
    createdAt: now,
    updatedAt: now,
  };
}