export const APP_LOCALES = ["zh-CN", "en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru"] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export const DEFAULT_APP_LOCALE: AppLocale = "en"

const messages = {
    "zh-CN": {
        bad_request: "请求无效",
        unauthorized: "未授权",
        forbidden: "无权访问",
        not_found: "未找到",
        validation_failed: "参数校验失败",
        internal_error: "内部错误",
        invalid_authorization_format: "无效的授权格式",
        invalid_token: "无效的令牌",
        invalid_json_body: "请求体必须是合法的 JSON",
        payload_too_large: "请求体过大",

        image_unsupported_type: "图片类型不支持",
        image_too_large: "图片过大",
        image_no_text_detected: "图片中未识别到文字",
        translation_rate_limited: "翻译请求过于频繁，请稍后再试",
        translation_daily_quota_exceeded: "今日翻译额度已用完，请明天再试",
        translation_concurrency_limited: "已有翻译正在进行，请等待完成后再试",
        translation_not_found: "翻译记录不存在",
        translation_not_configured: "翻译服务未配置",
        translation_empty_text: "待翻译文本不能为空",
        translation_truncated: "文本过长，译文超出长度上限被截断，请缩短后分批翻译",
        translation_empty_result: "模型未返回译文",
        translation_save_failed: "保存翻译记录失败",
        ai_upstream_error: "翻译失败，请稍后重试",
    },
    en: {
        bad_request: "Bad request",
        unauthorized: "Unauthorized",
        forbidden: "Forbidden",
        not_found: "Not found",
        validation_failed: "Validation failed",
        internal_error: "Internal error",
        invalid_authorization_format: "Invalid authorization format",
        invalid_token: "Invalid token",
        invalid_json_body: "Request body must be valid JSON",
        payload_too_large: "Request body is too large",

        image_unsupported_type: "Unsupported image type",
        image_too_large: "Image is too large",
        image_no_text_detected: "No text detected in the image",
        translation_rate_limited: "Too many translation requests. Please try again later.",
        translation_daily_quota_exceeded:
            "Daily translation quota exceeded. Please try again tomorrow.",
        translation_concurrency_limited:
            "Another translation is already running. Please wait for it to finish.",
        translation_not_found: "Translation record not found",
        translation_not_configured: "Translation service is not configured",
        translation_empty_text: "Text to translate cannot be empty",
        translation_truncated:
            "The text is too long. The translation exceeded the limit and was truncated. Please shorten it and translate in batches.",
        translation_empty_result: "The model returned no translation",
        translation_save_failed: "Failed to save the translation record",
        ai_upstream_error: "Translation failed. Please retry later.",
    },
    ja: {
        bad_request: "不正なリクエストです",
        unauthorized: "認証されていません",
        forbidden: "アクセス権限がありません",
        not_found: "見つかりません",
        validation_failed: "入力検証に失敗しました",
        internal_error: "内部エラー",
        invalid_authorization_format: "認証形式が無効です",
        invalid_token: "トークンが無効です",
        invalid_json_body: "リクエスト本文は有効な JSON である必要があります",
        payload_too_large: "リクエスト本文が大きすぎます",

        image_unsupported_type: "対応していない画像形式です",
        image_too_large: "画像が大きすぎます",
        image_no_text_detected: "画像内の文字を認識できませんでした",
        translation_rate_limited: "翻訳リクエストが多すぎます。しばらくしてから再試行してください",
        translation_daily_quota_exceeded: "本日の翻訳上限に達しました。明日もう一度お試しください",
        translation_concurrency_limited: "別の翻訳が実行中です。完了してから再試行してください",
        translation_not_found: "翻訳記録が見つかりません",
        translation_not_configured: "翻訳サービスが設定されていません",
        translation_empty_text: "翻訳するテキストは空にできません",
        translation_truncated:
            "テキストが長すぎます。訳文が上限を超えて切り詰められました。短くして分割翻訳してください。",
        translation_empty_result: "モデルが訳文を返しませんでした",
        translation_save_failed: "翻訳記録の保存に失敗しました",
        ai_upstream_error: "翻訳に失敗しました。しばらくしてから再試行してください",
    },
    ko: {
        bad_request: "잘못된 요청입니다",
        unauthorized: "인증되지 않았습니다",
        forbidden: "접근 권한이 없습니다",
        not_found: "찾을 수 없습니다",
        validation_failed: "입력값 검증에 실패했습니다",
        internal_error: "내부 오류",
        invalid_authorization_format: "인증 형식이 잘못되었습니다",
        invalid_token: "토큰이 잘못되었습니다",
        invalid_json_body: "요청 본문은 올바른 JSON이어야 합니다",
        payload_too_large: "요청 본문이 너무 큽니다",

        image_unsupported_type: "지원하지 않는 이미지 형식입니다",
        image_too_large: "이미지가 너무 큽니다",
        image_no_text_detected: "이미지에서 텍스트를 찾지 못했습니다",
        translation_rate_limited: "번역 요청이 너무 많습니다. 잠시 후 다시 시도하세요",
        translation_daily_quota_exceeded:
            "오늘 번역 한도를 모두 사용했습니다. 내일 다시 시도하세요",
        translation_concurrency_limited: "다른 번역이 진행 중입니다. 완료 후 다시 시도하세요",
        translation_not_found: "번역 기록을 찾을 수 없습니다",
        translation_not_configured: "번역 서비스가 설정되지 않았습니다",
        translation_empty_text: "번역할 텍스트는 비워 둘 수 없습니다",
        translation_truncated:
            "텍스트가 너무 깁니다. 번역문이 길이 제한을 초과해 잘렸습니다. 줄인 뒤 나누어 번역하세요.",
        translation_empty_result: "모델이 번역문을 반환하지 않았습니다",
        translation_save_failed: "번역 기록 저장에 실패했습니다",
        ai_upstream_error: "번역에 실패했습니다. 잠시 후 다시 시도하세요",
    },
    fr: {
        bad_request: "Requête invalide",
        unauthorized: "Non autorisé",
        forbidden: "Accès interdit",
        not_found: "Introuvable",
        validation_failed: "Échec de la validation",
        internal_error: "Erreur interne",
        invalid_authorization_format: "Format d’autorisation invalide",
        invalid_token: "Jeton invalide",
        invalid_json_body: "Le corps de la requête doit être un JSON valide",
        payload_too_large: "Le corps de la requête est trop volumineux",

        image_unsupported_type: "Type d’image non pris en charge",
        image_too_large: "L’image est trop volumineuse",
        image_no_text_detected: "Aucun texte détecté dans l’image",
        translation_rate_limited: "Trop de demandes de traduction. Réessayez plus tard.",
        translation_daily_quota_exceeded:
            "Quota de traduction quotidien dépassé. Réessayez demain.",
        translation_concurrency_limited: "Une autre traduction est déjà en cours. Attendez sa fin.",
        translation_not_found: "Traduction introuvable",
        translation_not_configured: "Le service de traduction n’est pas configuré",
        translation_empty_text: "Le texte à traduire ne peut pas être vide",
        translation_truncated:
            "Le texte est trop long. La traduction a dépassé la limite et a été tronquée. Raccourcissez-le et traduisez-le par lots.",
        translation_empty_result: "Le modèle n’a renvoyé aucune traduction",
        translation_save_failed: "Échec de l’enregistrement de la traduction",
        ai_upstream_error: "Échec de la traduction. Réessayez plus tard.",
    },
    de: {
        bad_request: "Ungültige Anfrage",
        unauthorized: "Nicht autorisiert",
        forbidden: "Zugriff verboten",
        not_found: "Nicht gefunden",
        validation_failed: "Validierung fehlgeschlagen",
        internal_error: "Interner Fehler",
        invalid_authorization_format: "Ungültiges Autorisierungsformat",
        invalid_token: "Ungültiges Token",
        invalid_json_body: "Der Anfragebody muss gültiges JSON sein",
        payload_too_large: "Der Anfragebody ist zu groß",

        image_unsupported_type: "Nicht unterstützter Bildtyp",
        image_too_large: "Das Bild ist zu groß",
        image_no_text_detected: "Im Bild wurde kein Text erkannt",
        translation_rate_limited: "Zu viele Übersetzungsanfragen. Bitte später erneut versuchen.",
        translation_daily_quota_exceeded:
            "Tägliches Übersetzungskontingent überschritten. Bitte morgen erneut versuchen.",
        translation_concurrency_limited: "Eine andere Übersetzung läuft bereits. Bitte warten.",
        translation_not_found: "Übersetzungseintrag nicht gefunden",
        translation_not_configured: "Der Übersetzungsdienst ist nicht konfiguriert",
        translation_empty_text: "Der zu übersetzende Text darf nicht leer sein",
        translation_truncated:
            "Der Text ist zu lang. Die Übersetzung hat das Limit überschritten und wurde abgeschnitten. Bitte kürzen und in Teilen übersetzen.",
        translation_empty_result: "Das Modell hat keine Übersetzung zurückgegeben",
        translation_save_failed: "Speichern des Übersetzungseintrags fehlgeschlagen",
        ai_upstream_error: "Übersetzung fehlgeschlagen. Bitte später erneut versuchen.",
    },
    es: {
        bad_request: "Solicitud inválida",
        unauthorized: "No autorizado",
        forbidden: "Acceso prohibido",
        not_found: "No encontrado",
        validation_failed: "Error de validación",
        internal_error: "Error interno",
        invalid_authorization_format: "Formato de autorización inválido",
        invalid_token: "Token inválido",
        invalid_json_body: "El cuerpo de la solicitud debe ser JSON válido",
        payload_too_large: "El cuerpo de la solicitud es demasiado grande",

        image_unsupported_type: "Tipo de imagen no compatible",
        image_too_large: "La imagen es demasiado grande",
        image_no_text_detected: "No se detectó texto en la imagen",
        translation_rate_limited: "Demasiadas solicitudes de traducción. Inténtalo más tarde.",
        translation_daily_quota_exceeded:
            "Se superó la cuota diaria de traducción. Inténtalo mañana.",
        translation_concurrency_limited: "Ya hay otra traducción en curso. Espera a que termine.",
        translation_not_found: "Registro de traducción no encontrado",
        translation_not_configured: "El servicio de traducción no está configurado",
        translation_empty_text: "El texto a traducir no puede estar vacío",
        translation_truncated:
            "El texto es demasiado largo. La traducción superó el límite y fue truncada. Acórtalo y tradúcelo por partes.",
        translation_empty_result: "El modelo no devolvió traducción",
        translation_save_failed: "No se pudo guardar el registro de traducción",
        ai_upstream_error: "Error de traducción. Inténtalo más tarde.",
    },
    pt: {
        bad_request: "Requisição inválida",
        unauthorized: "Não autorizado",
        forbidden: "Acesso proibido",
        not_found: "Não encontrado",
        validation_failed: "Falha na validação",
        internal_error: "Erro interno",
        invalid_authorization_format: "Formato de autorização inválido",
        invalid_token: "Token inválido",
        invalid_json_body: "O corpo da requisição deve ser JSON válido",
        payload_too_large: "O corpo da requisição é grande demais",

        image_unsupported_type: "Tipo de imagem não suportado",
        image_too_large: "A imagem é grande demais",
        image_no_text_detected: "Nenhum texto foi detectado na imagem",
        translation_rate_limited: "Muitas solicitações de tradução. Tente novamente mais tarde.",
        translation_daily_quota_exceeded:
            "Cota diária de tradução excedida. Tente novamente amanhã.",
        translation_concurrency_limited:
            "Outra tradução já está em andamento. Aguarde a conclusão.",
        translation_not_found: "Registro de tradução não encontrado",
        translation_not_configured: "O serviço de tradução não está configurado",
        translation_empty_text: "O texto para tradução não pode estar vazio",
        translation_truncated:
            "O texto é longo demais. A tradução excedeu o limite e foi truncada. Encurte e traduza em partes.",
        translation_empty_result: "O modelo não retornou tradução",
        translation_save_failed: "Falha ao salvar o registro de tradução",
        ai_upstream_error: "Falha na tradução. Tente novamente mais tarde.",
    },
    it: {
        bad_request: "Richiesta non valida",
        unauthorized: "Non autorizzato",
        forbidden: "Accesso negato",
        not_found: "Non trovato",
        validation_failed: "Validazione non riuscita",
        internal_error: "Errore interno",
        invalid_authorization_format: "Formato di autorizzazione non valido",
        invalid_token: "Token non valido",
        invalid_json_body: "Il corpo della richiesta deve essere JSON valido",
        payload_too_large: "Il corpo della richiesta è troppo grande",

        image_unsupported_type: "Tipo di immagine non supportato",
        image_too_large: "L’immagine è troppo grande",
        image_no_text_detected: "Nessun testo rilevato nell’immagine",
        translation_rate_limited: "Troppe richieste di traduzione. Riprova più tardi.",
        translation_daily_quota_exceeded:
            "Quota giornaliera di traduzione superata. Riprova domani.",
        translation_concurrency_limited: "Un’altra traduzione è già in corso. Attendi che finisca.",
        translation_not_found: "Record di traduzione non trovato",
        translation_not_configured: "Il servizio di traduzione non è configurato",
        translation_empty_text: "Il testo da tradurre non può essere vuoto",
        translation_truncated:
            "Il testo è troppo lungo. La traduzione ha superato il limite ed è stata troncata. Accorcialo e traducilo in parti.",
        translation_empty_result: "Il modello non ha restituito alcuna traduzione",
        translation_save_failed: "Impossibile salvare il record di traduzione",
        ai_upstream_error: "Traduzione non riuscita. Riprova più tardi.",
    },
    ru: {
        bad_request: "Некорректный запрос",
        unauthorized: "Не авторизовано",
        forbidden: "Доступ запрещен",
        not_found: "Не найдено",
        validation_failed: "Ошибка проверки данных",
        internal_error: "Внутренняя ошибка",
        invalid_authorization_format: "Некорректный формат авторизации",
        invalid_token: "Некорректный токен",
        invalid_json_body: "Тело запроса должно быть корректным JSON",
        payload_too_large: "Тело запроса слишком большое",

        image_unsupported_type: "Неподдерживаемый тип изображения",
        image_too_large: "Изображение слишком большое",
        image_no_text_detected: "На изображении не найден текст",
        translation_rate_limited: "Слишком много запросов на перевод. Повторите попытку позже.",
        translation_daily_quota_exceeded:
            "Дневной лимит переводов исчерпан. Повторите попытку завтра.",
        translation_concurrency_limited: "Другой перевод уже выполняется. Дождитесь завершения.",
        translation_not_found: "Запись перевода не найдена",
        translation_not_configured: "Сервис перевода не настроен",
        translation_empty_text: "Текст для перевода не может быть пустым",
        translation_truncated:
            "Текст слишком длинный. Перевод превысил лимит и был обрезан. Сократите текст и переводите частями.",
        translation_empty_result: "Модель не вернула перевод",
        translation_save_failed: "Не удалось сохранить запись перевода",
        ai_upstream_error: "Не удалось выполнить перевод. Повторите попытку позже.",
    },
} as const satisfies Record<AppLocale, Record<string, string>>

type ApiMessageKey = keyof (typeof messages)["zh-CN"]
type MessageValues = Record<string, string | number>

export function apiMessage(locale: AppLocale, key: ApiMessageKey, values: MessageValues = {}) {
    return messages[locale][key].replace(/\{(\w+)\}/g, (match, name) =>
        String(values[name] ?? match),
    )
}

export function localizedMessage(locale: AppLocale, code: string, fallback: string) {
    return code in messages[locale]
        ? apiMessage(locale, code as ApiMessageKey, { detail: fallback })
        : fallback
}

const localeAliases: Record<string, AppLocale> = {
    zh: "zh-CN",
    "zh-cn": "zh-CN",
    "zh-hans": "zh-CN",
    "zh-sg": "zh-CN",
    en: "en",
    ja: "ja",
    jp: "ja",
    ko: "ko",
    kr: "ko",
    fr: "fr",
    de: "de",
    es: "es",
    pt: "pt",
    it: "it",
    ru: "ru",
}

function normalizeTag(value: string) {
    return value.trim().split(";", 1)[0]?.toLowerCase().replaceAll("_", "-") ?? ""
}

function toSupportedLocale(value: string): AppLocale | null {
    const tag = normalizeTag(value)
    if (!tag) return null
    return localeAliases[tag] ?? localeAliases[tag.split("-", 1)[0] ?? ""] ?? null
}

function parseAcceptLanguage(value: string) {
    return value
        .split(",")
        .map((part, index) => {
            const [tag, ...params] = part.trim().split(";")
            const q = params
                .map((param) => param.trim())
                .find((param) => param.startsWith("q="))
                ?.slice(2)
            const weight = q ? Number(q) : 1
            return { tag: tag ?? "", weight: Number.isFinite(weight) ? weight : 0, index }
        })
        .filter((item) => item.tag && item.weight > 0)
        .sort((a, b) => b.weight - a.weight || a.index - b.index)
        .map((item) => item.tag)
}

export function resolveRequestLocale(acceptLanguage: string | undefined): AppLocale {
    const values = acceptLanguage ? parseAcceptLanguage(acceptLanguage) : []
    for (const value of values) {
        const locale = toSupportedLocale(value)
        if (locale) return locale
    }
    return DEFAULT_APP_LOCALE
}
