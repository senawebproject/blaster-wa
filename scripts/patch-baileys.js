// Patch Baileys: abaikan notifikasi link_code_companion_reg yang belum lengkap
// (WhatsApp kirim notif kosong dulu sebelum payload pairing asli -> "Invalid buffer").
const fs = require('fs');
const path = require('path');

try {
  const pkgDir = path.dirname(require.resolve('@whiskeysockets/baileys/package.json'));
  const file = path.join(pkgDir, 'lib', 'Socket', 'messages-recv.js');
  let src = fs.readFileSync(file, 'utf8');

  if (src.includes('__PATCH_LINKCODE__')) {
    console.log('[patch-baileys] sudah ter-patch, skip');
    process.exit(0);
  }

  const marker = "const linkCodeCompanionReg = getBinaryNodeChild(node, 'link_code_companion_reg');";
  if (!src.includes(marker)) {
    console.warn('[patch-baileys] marker tidak ketemu, versi Baileys beda? patch dilewati');
    process.exit(0);
  }

  const guard = `${marker}
                // __PATCH_LINKCODE__
                if (!linkCodeCompanionReg ||
                    !getBinaryNodeChildBuffer(linkCodeCompanionReg, 'link_code_pairing_ref') ||
                    !getBinaryNodeChildBuffer(linkCodeCompanionReg, 'primary_identity_pub') ||
                    !getBinaryNodeChildBuffer(linkCodeCompanionReg, 'link_code_pairing_wrapped_primary_ephemeral_pub')) {
                    logger.info('link_code_companion_reg belum lengkap, skip & tunggu payload asli');
                    break;
                }`;

  src = src.replace(marker, guard);
  fs.writeFileSync(file, src);
  console.log('[patch-baileys] berhasil di-patch:', file);
} catch (e) {
  console.warn('[patch-baileys] gagal (non-fatal):', e.message);
}
