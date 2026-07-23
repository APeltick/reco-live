import type * as z from "zod";

import { sendErrorReport } from "~shared/lib/error-report";

const T_T_DEV = { defaultErrorText: "Schema parse was failed" } as const;

interface ParseOptions {
  withSafeParse?: boolean;
  sendReportError?: boolean;
  parseErrorText?: string;
  showErrorInConsole?: boolean;
}

type ParseResult<Data extends z.ZodType>
  = | {
    data: z.output<Data>;
    failed: false;
  }
  | {
    data?: never;
    failed: true;
  };

export function dataParse<TSchema extends z.ZodType>(
  data: unknown,
  schema: TSchema,
  options?: ParseOptions,
): ParseResult<TSchema> {
  const {
    parseErrorText,
    sendReportError,
    showErrorInConsole,
    withSafeParse,
  } = {
    parseErrorText: T_T_DEV.defaultErrorText,
    sendReportError: true,
    showErrorInConsole: true,
    withSafeParse: true,
    ...options,
  };

  if (withSafeParse) {
    const parsedData = schema.safeParse(data);
    const isFailed = !parsedData.success;

    if (isFailed && showErrorInConsole) {
      console.error(parseErrorText, parsedData.error.issues[0]);
    }

    if (isFailed && sendReportError) {
      sendErrorReport({ title: parseErrorText });
    }

    if (isFailed) {
      return { failed: true };
    }

    return {
      data: parsedData.data,
      failed: false,
    };
  }

  try {
    return {
      data: schema.parse(data),
      failed: false,
    };
  } catch (error) {
    if (sendReportError) {
      sendErrorReport({ title: parseErrorText });
    }

    throw new Error(parseErrorText, { cause: error });
  }
}
