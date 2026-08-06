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
  title: string;
  description: string;
}
