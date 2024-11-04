export interface NavigationItem {
  text: string;
  link: string;
}
export type NavigationData = NavigationItem[];

export interface ProfileNavigationItem {
  text: string;
  tab: string;
}

export type ProfileNavigationData = ProfileNavigationItem[];