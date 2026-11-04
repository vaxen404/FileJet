export function adminQuotaBytes(value: string | number) {
    const text = String(value)
    if (!/^\d+(?:\.\d{1,6})?$/.test(text)) throw new Error('Enter a non-negative MiB value with up to six decimal places.')
    const [whole, fraction = ''] = text.split('.')
    const bytes = (BigInt(whole!) * 1000000n + BigInt(fraction.padEnd(6, '0'))) * 1048576n / 1000000n
    if (bytes > 9223372036854775807n) throw new Error('Storage limit is too large.')
    return bytes.toString()
}
