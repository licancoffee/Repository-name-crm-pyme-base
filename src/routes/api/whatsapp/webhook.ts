import { createFileRoute } from "@tanstack/react-router";

import {
  buildWhatsAppResponse,
  detectWhatsAppIntent,
} from "../../../lib/whatsapp/router";

import {
  handleWhatsAppConversation,
} from "../../../lib/whatsapp/conversation";

function verifyWebhook(request: Request) {
  const url = new URL(request.url);

  const mode =
    url.searchParams.get("hub.mode");

  const token =
    url.searchParams.get(
      "hub.verify_token",
    );

  const challenge =
    url.searchParams.get(
      "hub.challenge",
    );

  const verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    return new Response(
      "WHATSAPP_VERIFY_TOKEN no configurado",
      {
        status: 500,
      },
    );
  }

  if (
    mode === "subscribe" &&
    token === verifyToken &&
    challenge
  ) {
    return new Response(
      challenge,
      {
        status: 200,
        headers: {
          "Content-Type":
            "text/plain",
        },
      },
    );
  }

  return new Response(
    "Verificación rechazada",
    {
      status: 403,
    },
  );
}

type WhatsAppMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: {
    body?: string;
  };
};

function getIncomingMessage(
  body: any,
): WhatsAppMessage | null {
  return (
    body?.entry?.[0]
      ?.changes?.[0]
      ?.value?.messages?.[0] ??
    null
  );
}

function getWhatsAppConfig() {
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN;

  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN no configurado",
    );
  }

  if (!phoneNumberId) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID no configurado",
    );
  }

  return {
    accessToken,
    phoneNumberId,
  };
}

async function markWhatsAppMessageAsRead(
  messageId: string,
) {
  const {
    accessToken,
    phoneNumberId,
  } = getWhatsAppConfig();

  const response =
    await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          messaging_product:
            "whatsapp",
          status: "read",
          message_id:
            messageId,
        }),
      },
    );

  const result =
    await response.json();

  if (!response.ok) {
    console.error(
      "[WHATSAPP READ ERROR]",
      JSON.stringify(result),
    );

    /*
     * No detenemos la conversación
     * si solamente falla el estado leído.
     */
    return;
  }

  console.log(
    "[WHATSAPP READ OK]",
    JSON.stringify(result),
  );
}

async function sendWhatsAppText(
  to: string,
  text: string,
) {
  const {
    accessToken,
    phoneNumberId,
  } = getWhatsAppConfig();

  const response =
    await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          messaging_product:
            "whatsapp",
          recipient_type:
            "individual",
          to,
          type: "text",
          text: {
            preview_url: false,
            body: text,
          },
        }),
      },
    );

  const result =
    await response.json();

  if (!response.ok) {
    console.error(
      "[WHATSAPP SEND ERROR]",
      JSON.stringify(result),
    );

    throw new Error(
      `Meta API respondió ${response.status}`,
    );
  }

  console.log(
    "[WHATSAPP SEND OK]",
    JSON.stringify(result),
  );

  return result;
}

async function receiveWebhook(
  request: Request,
) {
  try {
    const body =
      await request.json();

    console.log(
      "[WHATSAPP WEBHOOK]",
      JSON.stringify(body),
    );

    const message =
      getIncomingMessage(body);

    if (!message) {
      return new Response(
        "EVENT_RECEIVED",
        {
          status: 200,
        },
      );
    }

    const from =
      message.from;

    if (!from) {
      return new Response(
        "EVENT_RECEIVED",
        {
          status: 200,
        },
      );
    }

    /*
     * Marcamos el mensaje como leído
     * apenas llega.
     */
    if (message.id) {
      await markWhatsAppMessageAsRead(
        message.id,
      );
    }

    if (
      message.type === "text"
    ) {
      const incomingText =
        message.text?.body?.trim() ??
        "";

      console.log(
        "[WHATSAPP MESSAGE]",
        JSON.stringify({
          from,
          text: incomingText,
        }),
      );

      const conversation =
        await handleWhatsAppConversation(
          from,
          incomingText,
        );

      if (
        conversation.handled &&
        conversation.reply
      ) {
        await sendWhatsAppText(
          from,
          conversation.reply,
        );

        return new Response(
          "EVENT_RECEIVED",
          {
            status: 200,
          },
        );
      }

      const intent =
        detectWhatsAppIntent(
          incomingText,
        );

      const reply =
        buildWhatsAppResponse(
          intent,
        );

      await sendWhatsAppText(
        from,
        reply,
      );
    }

    return new Response(
      "EVENT_RECEIVED",
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "[WHATSAPP WEBHOOK ERROR]",
      error,
    );

    return new Response(
      "EVENT_RECEIVED",
      {
        status: 200,
      },
    );
  }
}

export const Route =
  createFileRoute(
    "/api/whatsapp/webhook",
  )({
    server: {
      handlers: {
        GET: ({ request }) =>
          verifyWebhook(
            request,
          ),

        POST: ({ request }) =>
          receiveWebhook(
            request,
          ),
      },
    },
  });
  