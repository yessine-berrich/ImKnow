import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { userRole, UserStatus } from 'utils/constants';

const logger = new Logger('Seed:Users');

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  bio: string;
  status: UserStatus;
  country: string;
  city?: string;
}

const EMPLOYEES: UserData[] = [
  { firstName: 'Marie',     lastName: 'Dupont',      email: 'marie.dupont@imknow.com',        department: 'RH',            bio: "Responsable RH avec 8 ans d'expérience.",                          status: UserStatus.ACTIVE,   country: 'France', city: 'Paris' },
  { firstName: 'Thomas',    lastName: 'Martin',      email: 'thomas.martin@imknow.com',       department: 'Développement', bio: 'Développeur fullstack passionné par React et Node.js.',           status: UserStatus.ACTIVE,   country: 'France', city: 'Lyon' },
  { firstName: 'Sophie',    lastName: 'Laurent',     email: 'sophie.laurent@imknow.com',      department: 'Design',        bio: "Designer UX/UI centrée sur l'utilisateur.",                        status: UserStatus.ACTIVE,   country: 'France', city: 'Bordeaux' },
  { firstName: 'Lucas',     lastName: 'Bernard',     email: 'lucas.bernard@imknow.com',       department: 'DevOps',        bio: 'Ingénieur DevOps spécialisé cloud AWS.',                          status: UserStatus.ACTIVE,   country: 'France', city: 'Toulouse' },
  { firstName: 'Emma',      lastName: 'Moreau',      email: 'emma.moreau@imknow.com',         department: 'Marketing',     bio: 'Responsable marketing digital et growth hacking.',                status: UserStatus.ACTIVE,   country: 'France', city: 'Paris' },
  { firstName: 'Alexandre', lastName: 'Petit',       email: 'alexandre.petit@imknow.com',     department: 'Développement', bio: 'Développeur frontend spécialisé TypeScript.',                     status: UserStatus.ACTIVE,   country: 'France', city: 'Nantes' },
  { firstName: 'Camille',   lastName: 'Rousseau',    email: 'camille.rousseau@imknow.com',    department: 'Finance',       bio: 'Responsable financière, gestion budgétaire.',                     status: UserStatus.ACTIVE,   country: 'France', city: 'Lyon' },
  { firstName: 'Julien',    lastName: 'Leroy',       email: 'julien.leroy@imknow.com',        department: 'Développement', bio: "Architecte logiciel, 12 ans d'expérience.",                        status: UserStatus.ACTIVE,   country: 'France', city: 'Paris' },
  { firstName: 'Léa',       lastName: 'Dubois',      email: 'lea.dubois@imknow.com',          department: 'Juridique',     bio: 'Juriste spécialisée RGPD et droit du numérique.',                 status: UserStatus.ACTIVE,   country: 'France', city: 'Marseille' },
  { firstName: 'Nicolas',   lastName: 'Mercier',     email: 'nicolas.mercier@imknow.com',     department: 'Développement', bio: 'Senior fullstack, expert en architecture logicielle.',            status: UserStatus.ACTIVE,   country: 'France', city: 'Paris' },
  { firstName: 'Clarisse',  lastName: 'Renaud',      email: 'clarisse.renaud@imknow.com',     department: 'Marketing',     bio: 'Content manager spécialisée SEO et stratégie éditoriale.',        status: UserStatus.ACTIVE,   country: 'France', city: 'Lille' },
  { firstName: 'Antoine',   lastName: 'Lefèvre',     email: 'antoine.lefevre@imknow.com',     department: 'RH',            bio: "Ancien responsable RH, a quitté l'entreprise.",                    status: UserStatus.INACTIVE, country: 'France', city: 'Paris' },
  { firstName: 'Béatrice',  lastName: 'Chevallier',  email: 'beatrice.chevallier@imknow.com', department: 'Finance',       bio: 'Ancienne contrôleuse de gestion, compte désactivé.',              status: UserStatus.INACTIVE, country: 'France', city: 'Strasbourg' },
  { firstName: 'David',     lastName: 'Moreau',      email: 'david.moreau@imknow.com',        department: 'Développement', bio: 'Candidat développeur backend, en attente de validation.',          status: UserStatus.PENDING,  country: 'France', city: 'Rennes' },
  { firstName: 'Élodie',    lastName: 'Petit',       email: 'elodie.petit@imknow.com',        department: 'Design',        bio: 'Candidate UI designer, en attente de validation.',                status: UserStatus.PENDING,  country: 'France', city: 'Toulouse' },
];

export async function seedUsers(context?: INestApplicationContext): Promise<{ emailToUser: Record<string, User> }> {
  const ownContext = !context;
  if (!context) {
    context = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });
  }

  const userRepo = context.get<Repository<User>>(getRepositoryToken(User));

  const emailToUser: Record<string, User> = {};
  const passwordHash = await bcrypt.hash('Employee@1234', 10);
  const adminHash = await bcrypt.hash('Admin@1234', 10);

  try {
    const existingAdmin = await userRepo.findOne({ where: { email: 'admin@imknow.com' } });
    if (existingAdmin) {
      emailToUser['admin@imknow.com'] = existingAdmin;
      logger.log(`  ⏭️  Admin existe déjà (id=${existingAdmin.id})`);
    } else {
      const admin = userRepo.create({
        firstName: 'Admin',
        lastName: 'ImKnow',
        email: 'admin@imknow.com',
        password: adminHash,
        role: userRole.ADMIN,
        status: UserStatus.ACTIVE,
        isEmailActive: true,
        emailNotificationsEnabled: false,
        pushNotificationsEnabled: true,
      });
      emailToUser['admin@imknow.com'] = await userRepo.save(admin);
      logger.log(`  ✅ Admin créé (id=${emailToUser['admin@imknow.com'].id})`);
    }

    for (const emp of EMPLOYEES) {
      const existing = await userRepo.findOne({ where: { email: emp.email } });
      if (existing) {
        emailToUser[emp.email] = existing;
        logger.log(`  ⏭️  ${emp.email} existe déjà (${emp.status})`);
        continue;
      }
      const user = userRepo.create({
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        password: passwordHash,
        role: userRole.EMPLOYEE,
        department: emp.department,
        bio: emp.bio,
        country: emp.country,
        city: emp.city,
        status: emp.status,
        isEmailActive: emp.status === UserStatus.ACTIVE,
        isOnline: emp.status === UserStatus.ACTIVE,
        emailNotificationsEnabled: false,
        pushNotificationsEnabled: emp.status === UserStatus.ACTIVE,
      });
      emailToUser[emp.email] = await userRepo.save(user);
      logger.log(`  ✅ ${emp.firstName} ${emp.lastName} (${emp.status}, id=${user.id})`);
    }

    const total = await userRepo.count();
    logger.log(`  📊 Total utilisateurs : ${total}`);
    return { emailToUser };
  } finally {
    if (ownContext) await context.close();
  }
}

if (require.main === module) {
  seedUsers().catch(err => {
    logger.error('Erreur fatale:', err.message);
    process.exit(1);
  });
}
