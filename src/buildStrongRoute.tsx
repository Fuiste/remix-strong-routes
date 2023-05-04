import { redirect } from "@remix-run/server-runtime";
import { createElement } from "react";
import { NonRedirectStatus, RedirectStatus } from "./HttpStatusCode";
import { useStrongLoaderData, useStrongRouteError } from "./hooks";
import { strongResponse } from "./strongResponse";
import {
  BuildStrongRemixRouteExportsOpts,
  Errorable,
  StrongRemixRouteExports,
  StrongResponse,
} from "./types";

export const buildStrongRoute = <
  LoaderSuccess extends StrongResponse<unknown, NonRedirectStatus>,
  LoaderFailure extends StrongResponse<unknown, NonRedirectStatus>,
  LoaderRedirect extends StrongResponse<string, RedirectStatus>,
  ActionSuccess extends StrongResponse<unknown, NonRedirectStatus>,
  ActionFailure extends StrongResponse<unknown, NonRedirectStatus>,
  ActionRedirect extends StrongResponse<string, RedirectStatus>
>(
  opts: BuildStrongRemixRouteExportsOpts<
    LoaderSuccess,
    LoaderFailure,
    LoaderRedirect,
    ActionSuccess,
    ActionFailure,
    ActionRedirect
  >
): StrongRemixRouteExports<typeof opts> => {
  const { loader, action, Component, ErrorBoundary } = opts;
  const output = {} as StrongRemixRouteExports<typeof opts>;

  if (loader) {
    const isLoaderRedirect = (
      raw: LoaderRedirect | Errorable<LoaderSuccess, LoaderFailure>
    ): raw is LoaderRedirect => !Array.isArray(raw);

    output["loader"] = async (args) => {
      const result = await loader(args);

      if (isLoaderRedirect(result)) {
        const { data, ...init } = result;
        return redirect(data, init as ResponseInit);
      }

      const [response, err] = result;
      if (err) throw strongResponse(err);
      return strongResponse(response as LoaderSuccess);
    };
  }

  if (action) {
    const isActionRedirect = (
      raw: ActionRedirect | Errorable<ActionSuccess, ActionFailure>
    ): raw is ActionRedirect => !Array.isArray(raw);

    output["action"] = async (args) => {
      const result = await action(args);

      if (isActionRedirect(result)) {
        const { data, ...init } = result;
        return redirect(data, init as ResponseInit);
      }
      const [response, err] = result;
      if (err) throw strongResponse(err);
      return strongResponse(response as ActionSuccess);
    };
  }

  if (Component) {
    output["Component"] = () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const data = useStrongLoaderData<LoaderSuccess>();
      return createElement(Component, data as any);
    };
  }

  if (ErrorBoundary) {
    output["ErrorBoundary"] = () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const data = useStrongRouteError<LoaderFailure>();
      return createElement(ErrorBoundary, data as any);
    };
  }

  return output;
};
