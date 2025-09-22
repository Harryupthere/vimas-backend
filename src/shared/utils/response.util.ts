export function sendResponse(
  status: boolean,
  code: number,
  message: string,
  data: any = null,
) {
  return {
    status,
    code,
    message,
    data,
  };
}
