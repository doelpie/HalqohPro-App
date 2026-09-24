export interface Student {
  id: string;
  name: string;
  origin: string;
  address: string;
  phone: string;
  createdBy: string; // The Ustadz who created this student
  groupId?: string; // Optional: reference to the group they belong to
}

export interface Ustadz {
  id: string;
  name: string;
  origin: string;
  address: string;
  phone: string;
}

export interface User {
  id: string;
  username: string;
  role: 'Super Administrator' | 'Ustadz';
  ustadzName: string;
}

export interface Group {
  id: string;
  ustadz: string;
  students: string[];
}

export interface Material {
  id: string;
  meeting: number;
  title: string;
  slideLink: string;
  videoLink: string;
}

export interface Progress {
  id: string;
  groupId: string;
  meeting: number;
  date: string;
  attendance: string[];
  notes: string;
}

export interface Schedule {
  id: string;
  groupId: string;
  date: string;
  time: string;
  materialId?: string;
  title: string;
  description: string;
}

export type KontakanStatus = 
  | 'CKA' 
  | 'S0' 
  | 'S1' 
  | 'S2' 
  | 'S3' 
  | 'S4' 
  | 'PD' 
  | 'DIK' 
  | 'Pelajar';

export const KONTAKAN_STATUS_LABELS: Record<KontakanStatus, string> = {
  CKA: 'CKA - Calon Kontakan Awal',
  S0: 'S0 - Sudah ditemui dan proses profiling',
  S1: 'S1 - Sepakat Kondisi Saat Ini Rusak',
  S2: 'S2 - Sepakat Sistemnya Yang Rusak bukan Rezim/ Orangnya',
  S3: 'S3 - Sepakat Solusi Islam',
  S4: 'S4 - Sepakat Solusi Islam Kaffah',
  PD: 'PD - Pra Dauroh',
  DIK: 'DIK - Dauroh Islam Kaffah',
  Pelajar: 'Pelajar (Daris)',
};

export interface Kontakan {
  id: string;
  name: string;
  origin: string;
  address: string;
  phone: string;
  createdBy: string;
  status: KontakanStatus;
}

export interface KontakSchedule {
  id: string;
  kontakanId: string;
  date: string;
  time: string;
  materialId?: string;
  title: string;
  description: string;
}

export interface KontakProgress {
  id: string;
  kontakanId: string;
  date: string;
  materialId?: string;
  pembahasan: string;
  notes: string;
  createdBy: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  type: 'Liqo / Rapat' | 'Kajian Umum' | 'Mabit' | 'Rihlah / Outing' | 'Lainnya';
  meetingMode: 'Offline' | 'Online';
  location: string; // Alamat tempat fisik jika Offline, atau Link URL jika Online
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime?: string; // HH:mm
  description: string;
  invitedUstadz: string[]; // List nama/id ustadz
  invitedStudents: string[]; // List nama/id pelajar
  invitedOthers?: string[]; // Peserta eksternal / tambahan
  createdBy: string;
  createdAt?: string;
}

export interface AgendaProgress {
  id: string;
  agendaEventId?: string; // referensi ke AgendaEvent kalender jika ada
  title: string;
  type: 'Liqo / Rapat' | 'Kajian Umum' | 'Mabit' | 'Rihlah / Outing' | 'Lainnya';
  meetingMode: 'Offline' | 'Online';
  location: string; // Alamat tempat fisik jika Offline, atau Link URL jika Online
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  liqoCount?: number; // Sudah liqo ke berapa
  attendedUstadz: string[]; // Ustadz yang hadir
  attendedStudents: string[]; // Pelajar yang hadir
  attendedOthers?: string[]; // Peserta lain yang hadir
  pembahasan: string; // Isi pembahasan / notulensi
  notes?: string; // Catatan tambahan / tindak lanjut
  createdBy: string;
  createdAt?: string;
}

export interface AppConfig {
  title: string;
  subtitle: string;
  logoUrl: string;
  faviconUrl?: string;
  footerText?: string;
}

export type ActivityAction = 
  | 'CONFIG_UPDATE' 
  | 'LOGO_UPLOAD' 
  | 'BACKUP_EXPORT' 
  | 'DATA_IMPORT' 
  | 'DATA_EXPORT' 
  | 'PASSWORD_CHANGE' 
  | 'DRIVE_BACKUP' 
  | 'GOOGLE_SHEET_SYNC'
  | 'SYSTEM_RESET'
  | 'CUSTOM';

export type ActivityCategory = 'CONFIG' | 'BACKUP' | 'IMPORT' | 'EXPORT' | 'SECURITY' | 'SYNC' | 'SYSTEM';

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO 8601 string
  action: ActivityAction | string;
  category: ActivityCategory;
  title: string;
  description: string;
  actor: string; // Username or role
  details?: Record<string, any>;
}

export interface UpcomingAlert {
  id: string;
  source: 'kajian' | 'agenda' | 'kontak';
  title: string;
  category: string; // 'Kajian Pekanan' | 'Liqo / Rapat' | 'Kajian Umum' | dll
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  diffMinutes: number; // Menit menuju acara (bisa negatif jika baru mulai)
  meetingMode?: 'Offline' | 'Online';
  location?: string;
  description?: string;
  groupOrTarget?: string;
  invitedList?: string[];
  rawEvent?: any;
}
