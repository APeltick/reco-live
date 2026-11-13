import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";

import { getErrorMessage } from "./get-error-message";

const T_T_DEV = { retry: "Try again" } as const;

interface ErrorAlertProps {
  error: unknown;
  genericText: string;
  onRetry: () => void;
}

export function ErrorAlert({
  error,
  genericText,
  onRetry,
}: ErrorAlertProps) {
  return (
    <Alert
      action={(
        <Button color="inherit" onClick={onRetry} size="small">
          {T_T_DEV.retry}
        </Button>
      )}
      severity="error"
    >
      {getErrorMessage(error, genericText)}
    </Alert>
  );
}
