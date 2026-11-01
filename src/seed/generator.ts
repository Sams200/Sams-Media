import { faker } from '@faker-js/faker';
import { SocialLink, UserProfile } from '../profiles/entities/user-profile.js';

export const INTERESTS = [
  'gaming', 'hiking', 'cooking', 'photography', 'music', 'movies', 'reading',
  'travel', 'fitness', 'football', 'basketball', 'coding', 'art', 'anime',
  'gardening', 'fishing', 'cycling', 'running', 'swimming', 'yoga',
  'chess', 'boardgames', 'podcasts', 'science', 'history', 'fashion',
  'cars', 'diy', 'pets', 'astronomy', 'coffee', 'wine',
];

const PLATFORMS = ['github', 'twitter', 'instagram', 'linkedin'];

// generate random users
export function* generateUsers(count: number, chunkSize = 2000, seed = 42): Generator<UserProfile[]> {
  faker.seed(seed);
  let batch: UserProfile[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = `${faker.internet.username({ firstName, lastName }).toLowerCase()}_${i}`;
    const createdAt = faker.date.past({ years: 5 });

    batch.push({
      id: faker.string.uuid(),
      username,
      email: `${username}@example.com`,
      fullName: faker.person.fullName({ firstName, lastName }),
      bio: faker.lorem.sentences(faker.number.int({ min: 1, max: 3 })),
      birthDate: faker.date.birthdate({ mode: 'age', min: 18, max: 70 }).toISOString().slice(0, 10),
      gender: faker.helpers.arrayElement(['male', 'female', 'other']),
      city: faker.location.city(),
      country: faker.location.country(),
      location: { lat: faker.location.latitude(), lon: faker.location.longitude() },
      interests: faker.helpers.arrayElements(INTERESTS, { min: 2, max: 6 }),
      socialLinks: socialLinksFor(username),
      profilePictureUrl: `https://cdn.sams-media.example/avatars/${username}.png`,
      isPrivate: faker.number.int({ min: 1, max: 10 }) === 1,
      createdAt: createdAt.toISOString(),
      updatedAt: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
    });

    if (batch.length === chunkSize) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length) yield batch;
}

function socialLinksFor(username: string): SocialLink[] {
  const n = faker.number.int({ min: 0, max: 3 });
  return faker.helpers.arrayElements(PLATFORMS, n).map((p) => ({
    platform: p,
    url: `https://${p}.com/${username}`,
  }));
}