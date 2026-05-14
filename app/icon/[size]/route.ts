import { NextResponse } from "next/server"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params
  const sizeNum = parseInt(size)
  
  if (![192, 512].includes(sizeNum)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 })
  }

  const filePath = join(process.cwd(), "public", `icon-${sizeNum}x${sizeNum}.png`)
  
  if (existsSync(filePath)) {
    const buffer = readFileSync(filePath)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  }

  // Generate a simple SVG icon as fallback
  const svg = `<svg width="${sizeNum}" height="${sizeNum}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="80" fill="#059669"/>
    <text x="256" y="300" font-size="200" fill="white" text-anchor="middle" font-family="Arial" font-weight="bold">V</text>
  </svg>`
  
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000",
    },
  })
}
