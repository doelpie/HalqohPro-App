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
