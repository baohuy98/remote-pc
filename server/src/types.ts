export interface Command {
  action: string;
  params: Record<string, any>;
}

export interface Response {
  action: string;
  data: any;
  success: boolean;
  error?: string;
}
