import { useEffect, useState } from "react";
import type { ValidateForm } from "ra-core";
import { Form, required, useNotify, useTranslate } from "ra-core";
import { useSetPassword, useSupabaseAccessToken } from "ra-supabase-core";
import type { FieldValues, SubmitHandler } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/admin/text-input";
import { Layout } from "@/components/supabase/layout";
import { supabase } from "@/components/atomic-crm/providers/supabase/supabase";

interface FormData {
  password: string;
  confirmPassword: string;
}

export const SetPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  // PKCE flow: auth-callback.html forwards ?code= when Supabase uses PKCE
  const code = searchParams.get("code");

  // Implicit flow: tokens arrive directly in the URL
  const access_token_param = useSupabaseAccessToken();
  const refresh_token_param = useSupabaseAccessToken({
    parameterName: "refresh_token",
  });

  // For PKCE, exchange the code for a session and extract tokens
  const [pkceTokens, setPkceTokens] = useState<{
    access_token: string;
    refresh_token: string;
  } | null>(null);
  const [pkceError, setPkceError] = useState(false);

  useEffect(() => {
    if (!code) return;
    supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (error || !data.session) {
        setPkceError(true);
        return;
      }
      setPkceTokens({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    });
  }, [code]);

  const access_token = pkceTokens?.access_token ?? access_token_param;
  const refresh_token = pkceTokens?.refresh_token ?? refresh_token_param;

  const notify = useNotify();
  const translate = useTranslate();
  const [, { mutateAsync: setPassword }] = useSetPassword();

  const validate = (values: FormData) => {
    if (values.password !== values.confirmPassword) {
      return {
        password: "ra-supabase.validation.password_mismatch",
        confirmPassword: "ra-supabase.validation.password_mismatch",
      };
    }
    return {};
  };

  // Show spinner while PKCE code exchange is in progress
  if (code && !pkceTokens && !pkceError) {
    return (
      <Layout>
        <p>{translate("ra.message.loading", { _: "Loading…" })}</p>
      </Layout>
    );
  }

  if (pkceError || (!access_token || !refresh_token)) {
    if (process.env.NODE_ENV === "development") {
      console.error("Missing access_token or refresh_token for set password");
    }
    return (
      <Layout>
        <p>{translate("ra-supabase.auth.missing_tokens")}</p>
      </Layout>
    );
  }

  const submit = async (values: FormData) => {
    try {
      setLoading(true);
      await setPassword({
        access_token,
        refresh_token,
        password: values.password,
      });
    } catch (error: any) {
      notify(
        typeof error === "string"
          ? error
          : typeof error === "undefined" || !error.message
            ? "ra.auth.sign_in_error"
            : error.message,
        {
          type: "warning",
          messageArgs: {
            _:
              typeof error === "string"
                ? error
                : error && error.message
                  ? error.message
                  : undefined,
          },
        },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {translate("ra-supabase.set_password.new_password", {
            _: "Choose your password",
          })}
        </h1>
      </div>
      <Form<FormData>
        className="space-y-8"
        onSubmit={submit as SubmitHandler<FieldValues>}
        validate={validate as ValidateForm}
      >
        <TextInput
          label={translate("ra.auth.password", {
            _: "Password",
          })}
          autoComplete="new-password"
          source="password"
          type="password"
          validate={required()}
        />
        <TextInput
          label={translate("ra.auth.confirm_password", {
            _: "Confirm password",
          })}
          source="confirmPassword"
          type="password"
          validate={required()}
        />
        <Button type="submit" className="cursor-pointer" disabled={loading}>
          {translate("ra.action.save")}
        </Button>
      </Form>
    </Layout>
  );
};

SetPasswordPage.path = "set-password";
