import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_SHARE_PERMISSIONS,
  hasShareableContent,
  normalizeSharePermissions,
  parseSharePermissions,
  permissionsFromScope,
  scopeFromPermissions,
  type SharePermissions,
} from "@/lib/meetings/share-permissions";
import type { ShareScope } from "@/lib/workflow/types";

type ShareTokenListRow = {
  id: string;
  token: string;
  scope: ShareScope;
  permissions: unknown;
  expires_at: string;
  created_at: string;
};

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 7;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("share_tokens")
    .select("id, token, scope, expires_at, revoked_at, created_at")
    .eq("meeting_id", id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tokens = ((data ?? []) as ShareTokenListRow[]).map((token) => ({
    ...token,
    permissions: parseSharePermissions(
      token.permissions ?? permissionsFromScope(token.scope)
    ),
  }));

  return NextResponse.json({ tokens });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    scope?: ShareScope;
    permissions?: Partial<SharePermissions>;
    days?: number;
    redact_pii?: boolean;
  };

  const permissions = normalizeSharePermissions(
    body.permissions
      ? { ...DEFAULT_SHARE_PERMISSIONS, ...body.permissions }
      : body.scope
        ? permissionsFromScope(body.scope)
        : { ...DEFAULT_SHARE_PERMISSIONS }
  );

  if (!hasShareableContent(permissions)) {
    return NextResponse.json(
      { error: "Selecione ao menos um conteúdo para compartilhar" },
      { status: 400 }
    );
  }

  const scope = scopeFromPermissions(permissions);
  const days = Math.min(Math.max(body.days ?? DEFAULT_DAYS, 1), 30);
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
  const redactPii = body.redact_pii !== false;

  const admin = createAdminClient();
  const insertBase = {
    meeting_id: id,
    user_id: user.id,
    scope,
    expires_at: expiresAt,
    redact_pii: redactPii,
  };

  let { data, error } = await admin
    .from("share_tokens")
    .insert({ ...insertBase, permissions })
    .select("id, token, scope, expires_at, created_at")
    .single();

  if (error?.code === "42703") {
    ({ data, error } = await admin
      .from("share_tokens")
      .insert(insertBase)
      .select("id, token, scope, expires_at, created_at")
      .single());
  }

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao criar link de compartilhamento" },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${appUrl}/s/${data.token}`;

  return NextResponse.json({
    token: {
      ...data,
      permissions: parseSharePermissions(
        (data as ShareTokenListRow).permissions ?? permissionsFromScope(scope)
      ),
    },
    url,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get("tokenId");

  if (!tokenId) {
    return NextResponse.json({ error: "tokenId obrigatório" }, { status: 400 });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("share_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("meeting_id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
