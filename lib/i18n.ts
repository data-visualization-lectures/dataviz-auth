export type Locale = "ja" | "en";

const dict = {
  // ── header ──
  "header.siteName": { ja: "データの道具箱", en: "Data Toolbox" },
  "header.navTools": { ja: "ツール一覧", en: "Tools" },
  "header.navProjects": { ja: "保存プロジェクト一覧", en: "Saved Projects" },
  "header.navAccount": { ja: "アカウント情報", en: "Account" },

  // ── account page ──
  "account.title": { ja: "アカウント情報", en: "Account" },
  "account.description": {
    ja: "契約プランやプロフィールの管理を行えます。",
    en: "Manage your subscription and profile.",
  },
  "account.userInfo": { ja: "ユーザー情報", en: "User Info" },
  "account.createdAt": { ja: "アカウント作成日", en: "Account created" },
  "account.currentPlan": { ja: "現在のプラン", en: "Current Plan" },
  "account.defaultPlanName": {
    ja: "dataviz.jp利用サブスク",
    en: "dataviz.jp Subscription",
  },
  "account.freePlan": { ja: "フリープラン", en: "Free Plan" },
  "account.statusActive": { ja: "有効", en: "Active" },
  "account.statusTrialing": { ja: "トライアル中", en: "Trialing" },
  "account.statusCanceled": {
    ja: "解約済 (期限まで有効)",
    en: "Canceled (valid until end)",
  },
  "account.statusExpired": { ja: "契約終了", en: "Expired" },
  "account.statusNone": { ja: "未契約", en: "No subscription" },
  "account.nextRenewal": { ja: "次回更新日", en: "Next renewal" },
  "account.trialEnd": { ja: "トライアル終了日", en: "Trial ends" },
  "account.validUntil": { ja: "有効期限", en: "Valid until" },
  "account.yearly": { ja: "年", en: "year" },
  "account.monthly": { ja: "月", en: "month" },
  "account.loginInfo": { ja: "ログイン情報", en: "Login Info" },
  "account.lastLogin": { ja: "最終ログイン", en: "Last login" },
  "account.loginMethod": { ja: "ログイン方法", en: "Login method" },
  "account.providerEmail": { ja: "メール / パスワード", en: "Email / Password" },
  "account.providerUnknown": { ja: "不明", en: "Unknown" },
  "account.providerSeparator": { ja: "、", en: ", " },
  "account.projectInfo": { ja: "プロジェクト情報", en: "Project Info" },
  "account.projectCount": { ja: "件", en: " projects" },
  "account.contact": { ja: "お問い合わせ", en: "Contact" },
  "account.contactLink": {
    ja: "ご契約中のお問い合わせ",
    en: "Subscriber contact",
  },
  "account.dateUnknown": { ja: "不明", en: "Unknown" },
  "account.bannerFeature": { ja: "サービス紹介", en: "Service Overview" },
  "account.bannerCatalogue": { ja: "チャートカタログ", en: "Chart Catalogue" },
  "account.bannerVisualizing": { ja: "チャート解説", en: "Chart Explanations" },

  // ── projects page ──
  "projects.title": { ja: "保存プロジェクト一覧", en: "Saved Projects" },
  "projects.description": {
    ja: "さまざまなツールから保存したプロジェクトの一覧です。ワンクリックでアクセスしたり、不要なものを削除できます。",
    en: "A list of projects saved from various tools. Access them with one click or delete the ones you no longer need.",
  },

  // ── team projects ──
  "projects.groupTitle": { ja: "チームプロジェクト", en: "Team Projects" },
  "projects.groupDescription": {
    ja: "チームリーダーが共有したプロジェクトの一覧です。「開く」で閲覧し、編集後「保存」すると自分のプロジェクトとして保存されます。",
    en: "Projects shared by your team leader. Open to view, and save after editing to keep as your own project.",
  },

  // ── account: group info ──
  "account.groupInfo": { ja: "チーム情報", en: "Team Info" },
  "account.groupName": { ja: "チーム名", en: "Team Name" },
  "account.groupRole": { ja: "役割", en: "Role" },
  "account.groupRoleOwner": { ja: "リーダー", en: "Leader" },
  "account.groupRoleMember": { ja: "メンバー", en: "Member" },
  "account.groupMembers": { ja: "メンバー数", en: "Members" },

  // ── ManageSubscriptionButton ──
  "manage.change": { ja: "契約内容の変更", en: "Manage Subscription" },
  "manage.viewPlans": { ja: "料金プランを見る", en: "View Plans" },
  "manage.errorResponse": { ja: "レスポンス異常", en: "Response error" },
  "manage.errorFailed": { ja: "操作に失敗しました", en: "Operation failed" },

  // ── DeleteAccountButton ──
  "deleteAccount.confirm": {
    ja: "この操作は取り消せません。アカウントに紐づくすべてのデータが削除されます。本当に削除しますか？",
    en: "This action cannot be undone. All data associated with your account will be deleted. Are you sure?",
  },
  "deleteAccount.error": {
    ja: "アカウント削除に失敗しました",
    en: "Failed to delete account",
  },
  "deleteAccount.deleting": { ja: "削除中...", en: "Deleting..." },
  "deleteAccount.button": { ja: "アカウントを削除", en: "Delete Account" },

  // ── CancelAndRefundButton ──
  "refund.confirm": {
    ja: "解約して全額返金します。この操作は取り消せません。本当に実行しますか？",
    en: "Cancel and receive a full refund. This action cannot be undone. Are you sure?",
  },
  "refund.success": {
    ja: "解約・返金が完了しました",
    en: "Cancellation and refund completed",
  },
  "refund.expired": {
    ja: "返金期間（14日）を過ぎているか、既に返金済みです",
    en: "Refund period (14 days) has passed or already refunded",
  },
  "refund.error": { ja: "返金処理に失敗しました", en: "Refund failed" },
  "refund.processing": { ja: "処理中...", en: "Processing..." },
  "refund.button": {
    ja: "14日以内なら解約して返金する",
    en: "Cancel & refund within 14 days",
  },

  // ── EditDisplayName ──
  "displayName.label": { ja: "表示名", en: "Display name" },
  "displayName.notSet": { ja: "未設定", en: "Not set" },
  "displayName.placeholder": { ja: "表示名を入力", en: "Enter display name" },
  "displayName.saveError": { ja: "保存に失敗しました", en: "Failed to save" },

  // ── ChangePasswordButton ──
  "password.rateLimited": {
    ja: "メール送信の上限に達しました。しばらく時間をおいて再度お試しください。",
    en: "Rate limit reached. Please try again later.",
  },
  "password.sendError": { ja: "送信に失敗しました", en: "Failed to send" },
  "password.sent": {
    ja: "パスワード変更メールを送信しました。メールをご確認ください。",
    en: "Password reset email sent. Please check your inbox.",
  },
  "password.sending": { ja: "送信中...", en: "Sending..." },
  "password.button": {
    ja: "パスワードを変更する",
    en: "Change password",
  },

  // ── ChangeEmailForm ──
  "email.sameError": {
    ja: "現在と異なるメールアドレスを入力してください",
    en: "Please enter a different email address",
  },
  "email.rateLimited": {
    ja: "メール送信の上限に達しました。しばらく時間をおいて再度お試しください。",
    en: "Rate limit reached. Please try again later.",
  },
  "email.sent": {
    ja: " に確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。",
    en: ". Confirmation email sent. Click the link in the email to complete the change.",
  },
  "email.button": {
    ja: "メールアドレスを変更する",
    en: "Change email address",
  },
  "email.placeholder": {
    ja: "新しいメールアドレス",
    en: "New email address",
  },

  // ── SavedProjectsGrid ──
  "grid.empty": {
    ja: "保存されたプロジェクトはありません",
    en: "No saved projects",
  },
  "grid.allTools": { ja: "すべてのツール", en: "All Tools" },
  "grid.noMatch": {
    ja: "条件に一致するプロジェクトはありません",
    en: "No matching projects",
  },
  "grid.updated": { ja: "更新", en: "Updated" },
  "grid.open": { ja: "開く", en: "Open" },
  "grid.delete": { ja: "削除", en: "Delete" },
  "grid.confirmDelete": {
    ja: "を削除してもよろしいですか？\nこの操作は取り消せません。",
    en: "?\nThis action cannot be undone.",
  },
  "grid.deleted": {
    ja: "プロジェクトを削除しました",
    en: "Project deleted",
  },
  "grid.deleteError": { ja: "削除に失敗しました", en: "Failed to delete" },
  "grid.error": { ja: "エラーが発生しました", en: "An error occurred" },

  // ── login form ──
  "login.title": { ja: "ログイン", en: "Log in" },
  "login.description": {
    ja: "アカウントにログインするにはメールアドレスを入力してください",
    en: "Enter your email to sign in to your account",
  },
  "login.email": { ja: "メールアドレス", en: "Email" },
  "login.password": { ja: "パスワード", en: "Password" },
  "login.forgotPassword": {
    ja: "パスワードをお忘れですか？",
    en: "Forgot your password?",
  },
  "login.submitting": { ja: "ログイン中...", en: "Logging in..." },
  "login.submit": { ja: "ログイン", en: "Log in" },
  "login.or": { ja: "または", en: "or" },
  "login.google": { ja: "Googleでログイン", en: "Log in with Google" },
  "login.noAccount": {
    ja: "アカウントをお持ちでないですか？",
    en: "Don't have an account?",
  },
  "login.signUpLink": { ja: "新規登録", en: "Sign up" },
  "login.error": { ja: "エラーが発生しました", en: "An error occurred" },

  // ── sign-up form ──
  "signUp.title": { ja: "新規登録", en: "Sign up" },
  "signUp.description": {
    ja: "新しいアカウントを作成",
    en: "Create a new account",
  },
  "signUp.email": { ja: "メールアドレス", en: "Email" },
  "signUp.password": { ja: "パスワード", en: "Password" },
  "signUp.confirmPassword": {
    ja: "パスワード（確認）",
    en: "Confirm password",
  },
  "signUp.submitting": {
    ja: "アカウント作成中...",
    en: "Creating account...",
  },
  "signUp.submit": { ja: "登録する", en: "Sign up" },
  "signUp.or": { ja: "または", en: "or" },
  "signUp.google": { ja: "Googleで登録", en: "Sign up with Google" },
  "signUp.hasAccount": {
    ja: "すでにアカウントをお持ちですか？",
    en: "Already have an account?",
  },
  "signUp.loginLink": { ja: "ログイン", en: "Log in" },
  "signUp.error": { ja: "エラーが発生しました", en: "An error occurred" },
  "signUp.passwordMismatch": {
    ja: "パスワードが一致しません",
    en: "Passwords do not match",
  },

  // ── sign-up success ──
  "signUp.successTitle": {
    ja: "サインアップありがとうございます！",
    en: "Thanks for signing up!",
  },
  "signUp.successCheck": {
    ja: "メールを確認してください",
    en: "Check your email",
  },
  "signUp.successBody": {
    ja: "サインアップが完了しました。サインインする前に、メールを確認してアカウントを認証してください。",
    en: "Sign-up complete. Please verify your account by clicking the link in your email before signing in.",
  },

  // ── forgot password ──
  "forgotPassword.checkTitle": {
    ja: "メールを確認してください",
    en: "Check Your Email",
  },
  "forgotPassword.checkDesc": {
    ja: "パスワードリセットの手順を送信しました",
    en: "Password reset instructions sent",
  },
  "forgotPassword.checkBody": {
    ja: "メールとパスワードで登録された方には、パスワードリセットメールが届きます。",
    en: "If you registered using your email and password, you will receive a password reset email.",
  },
  "forgotPassword.title": {
    ja: "パスワードをリセット",
    en: "Reset Your Password",
  },
  "forgotPassword.description": {
    ja: "メールアドレスを入力してください。リセットリンクを送信します。",
    en: "Type in your email and we'll send you a link to reset your password",
  },
  "forgotPassword.email": { ja: "メールアドレス", en: "Email" },
  "forgotPassword.submitting": { ja: "送信中...", en: "Sending..." },
  "forgotPassword.submit": {
    ja: "リセットメールを送信",
    en: "Send reset email",
  },
  "forgotPassword.hasAccount": {
    ja: "すでにアカウントをお持ちですか？",
    en: "Already have an account?",
  },
  "forgotPassword.loginLink": { ja: "ログイン", en: "Login" },
  "forgotPassword.error": {
    ja: "エラーが発生しました",
    en: "An error occurred",
  },

  // ── update password ──
  "updatePassword.title": {
    ja: "パスワードをリセット",
    en: "Reset Your Password",
  },
  "updatePassword.description": {
    ja: "新しいパスワードを入力してください。",
    en: "Please enter your new password below.",
  },
  "updatePassword.label": { ja: "新しいパスワード", en: "New password" },
  "updatePassword.submitting": { ja: "保存中...", en: "Saving..." },
  "updatePassword.submit": {
    ja: "新しいパスワードを保存",
    en: "Save new password",
  },
  "updatePassword.error": {
    ja: "エラーが発生しました",
    en: "An error occurred",
  },

  // ── auth shared ──
  "auth.logout": { ja: "ログアウト", en: "Log out" },
  "auth.login": { ja: "ログイン", en: "Log in" },
  "auth.signUp": { ja: "新規登録", en: "Sign up" },

  // ── auth error pages ──
  "authError.title": { ja: "認証エラー", en: "Authentication Error" },
  "authError.body": {
    ja: "ログイン情報の確認中にエラーが発生しました。再度ログインしてください。",
    en: "There was an error verifying your login information. Please try logging in again.",
  },
  "authError.backToLogin": { ja: "ログインに戻る", en: "Back to Login" },
  "authError.genericTitle": {
    ja: "エラーが発生しました",
    en: "Sorry, something went wrong.",
  },
  "authError.codeError": { ja: "エラーコード: ", en: "Code error: " },
  "authError.unspecified": {
    ja: "不明なエラーが発生しました。",
    en: "An unspecified error occurred.",
  },

  // ── data library page ──
  "header.navDataLibrary": { ja: "データ一覧", en: "Data Library" },
  "dataLibrary.title": { ja: "データ一覧", en: "Data Library" },
  "dataLibrary.description": {
    ja: "サンプルデータを検索して、対応するツールで開くことができます。",
    en: "Search sample datasets and open them with compatible tools.",
  },
  "dataLibrary.searchPlaceholder": {
    ja: "データセットを検索...",
    en: "Search datasets...",
  },
  "dataLibrary.allCategories": {
    ja: "すべてのカテゴリ",
    en: "All Categories",
  },
  "dataLibrary.allFormats": { ja: "すべてのフォーマット", en: "All Formats" },
  "dataLibrary.allTools": { ja: "すべてのツール", en: "All Tools" },
  "dataLibrary.rows": { ja: "行", en: "rows" },
  "dataLibrary.columns": { ja: "列", en: "columns" },
  "dataLibrary.openWith": { ja: "このデータを開く", en: "Open with" },
  "dataLibrary.preview": { ja: "データプレビュー", en: "Data Preview" },
  "dataLibrary.noResults": {
    ja: "条件に一致するデータが見つかりません。",
    en: "No datasets match your filters.",
  },
  "dataLibrary.clearFilters": {
    ja: "フィルターをクリア",
    en: "Clear filters",
  },
  "dataLibrary.catTabular": { ja: "表形式", en: "Tabular" },
  "dataLibrary.catGeographic": { ja: "地理", en: "Geographic" },
  "dataLibrary.catNetwork": { ja: "ネットワーク", en: "Network" },
  "dataLibrary.catSpec": { ja: "宣言的仕様", en: "Spec" },
  "dataLibrary.subscriptionRequired": {
    ja: "データライブラリは有料プランの機能です。",
    en: "Data Library is a paid plan feature.",
  },

  "grid.subscriptionRequired": {
    ja: "有料プランが必要です",
    en: "Subscription required",
  },

  // ── public projects section on /projects page ──
  "projects.publicTitle": { ja: "パブリック・プロジェクト", en: "Public Projects" },
  "projects.publicDescription": {
    ja: "各ツールのパブリック・プロジェクトを試すことができます。「開く」で閲覧し、編集後「保存」すると自分のプロジェクトとして保存されます。",
    en: "Try public projects for each tool. Open to view, and save after editing to keep as your own project.",
  },

  // ── public projects page ──
  "public.title": { ja: "パブリック・プロジェクト", en: "Public Projects" },
  "public.description": {
    ja: "各ツールのパブリック・プロジェクトを試すことができます。「開く」で閲覧し、編集後「保存」すると自分のプロジェクトとして保存されます。",
    en: "Try public projects for each tool. Open to view, and save after editing to keep as your own project.",
  },
  "public.empty": {
    ja: "公開プロジェクトはまだありません",
    en: "No public projects available yet",
  },

  // ── checkout form ──
  "checkout.title": { ja: "お申し込み", en: "Checkout" },
  "checkout.description": {
    ja: "プラン情報を確認し、必要事項を入力してください",
    en: "Review your plan and fill in the required information",
  },
  "checkout.selectedPlan": { ja: "選択中のプラン", en: "Selected plan" },
  "checkout.displayNameLabel": { ja: "表示名", en: "Display name" },
  "checkout.displayNamePlaceholder": {
    ja: "例: 田中太郎",
    en: "e.g. Jane Doe",
  },
  "checkout.displayNameHelp": {
    ja: "サービス内で表示される名前です",
    en: "This name will be shown within the service",
  },
  "checkout.termsLink": { ja: "利用規約", en: "Terms of Service" },
  "checkout.privacyLink": {
    ja: "プライバシーポリシー",
    en: "Privacy Policy",
  },
  "checkout.agreeToTermsBefore": { ja: "", en: "I agree to the " },
  "checkout.agreeToTermsAfter": { ja: "に同意する", en: "" },
  "checkout.agreeToPrivacyBefore": { ja: "", en: "I agree to the " },
  "checkout.agreeToPrivacyAfter": { ja: "に同意する", en: "" },
  "checkout.errorNoName": {
    ja: "表示名を入力してください",
    en: "Please enter your display name",
  },
  "checkout.errorNoAgreement": {
    ja: "利用規約とプライバシーポリシーに同意してください",
    en: "Please agree to the Terms of Service and Privacy Policy",
  },
  "checkout.errorProfileSave": {
    ja: "プロフィールの保存に失敗しました",
    en: "Failed to save profile",
  },
  "checkout.errorSession": {
    ja: "チェックアウトセッションの作成に失敗しました",
    en: "Failed to create checkout session",
  },
  "checkout.errorGeneric": {
    ja: "エラーが発生しました",
    en: "An error occurred",
  },
  "checkout.submit": { ja: "決済に進む", en: "Proceed to payment" },
  "checkout.submitting": { ja: "処理中...", en: "Processing..." },
  "checkout.alreadySubscribed": {
    ja: "既に契約済みです。アカウントページへ移動します。",
    en: "You are already subscribed. Redirecting to your account page.",
  },
} as const;

export type TranslationKey = keyof typeof dict;

export function t(locale: Locale, key: TranslationKey): string {
  return dict[key][locale];
}

/** 日付フォーマット（ロケール対応） */
export function formatDateLocale(
  locale: Locale,
  dateString?: string,
  style: "long" | "short" = "long"
): string {
  if (!dateString) return t(locale, "account.dateUnknown");
  const loc = locale === "ja" ? "ja-JP" : "en-US";
  if (style === "short") {
    return new Date(dateString).toLocaleDateString(loc, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  }
  return new Date(dateString).toLocaleDateString(loc, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });
}
