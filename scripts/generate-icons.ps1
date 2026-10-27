Add-Type -AssemblyName System.Drawing

$publicIconsDir = Join-Path $PSScriptRoot "..\public\icons"
if (-not (Test-Path $publicIconsDir)) {
    New-Item -ItemType Directory -Path $publicIconsDir -Force | Out-Null
}

function Generate-AppIcon {
    param (
        [int]$size,
        [string]$outputPath,
        [bool]$isMaskable = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background gradient
    $bgRect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
    $cTop = [System.Drawing.Color]::FromArgb(255, 26, 30, 39)    # #1a1e27
    $cBottom = [System.Drawing.Color]::FromArgb(255, 14, 16, 22) # #0e1016
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($bgRect, $cTop, $cBottom, [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    
    if ($isMaskable) {
        # Maskable icon: fill entire rectangular canvas
        $g.FillRectangle($bgBrush, $bgRect)
    } else {
        # Transparent background, rounded squircle icon
        $g.Clear([System.Drawing.Color]::Transparent)
        $cornerRadius = [int]($size * 0.22)
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $cornerRadius * 2
        $r = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
        $path.AddArc($r.X, $r.Y, $d, $d, 180, 90)
        $path.AddArc($r.X + $r.Width - $d, $r.Y, $d, $d, 270, 90)
        $path.AddArc($r.X + $r.Width - $d, $r.Y + $r.Height - $d, $d, $d, 0, 90)
        $path.AddArc($r.X, $r.Y + $r.Height - $d, $d, $d, 90, 90)
        $path.CloseFigure()
        $g.FillPath($bgBrush, $path)

        # Border
        $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(60, 200, 168, 107), [float]($size * 0.015))
        $g.DrawPath($borderPen, $path)
        $borderPen.Dispose()
        $path.Dispose()
    }
    $bgBrush.Dispose()

    # Scale factor inside safe area
    $center = $size / 2
    $scale = if ($isMaskable) { $size * 0.72 } else { $size * 0.82 }
    $innerRadius = $scale / 2

    # Outer decorative brass ring
    $ringPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 200, 168, 107), [float]($size * 0.024))
    $ringRect = [System.Drawing.RectangleF]::new($center - $innerRadius, $center - $innerRadius, $scale, $scale)
    $g.DrawEllipse($ringPen, $ringRect)
    $ringPen.Dispose()

    # Accent speed arc (crimson #c8452b)
    $arcPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 200, 69, 43), [float]($size * 0.045))
    $arcRect = [System.Drawing.RectangleF]::new($center - $innerRadius * 0.95, $center - $innerRadius * 0.95, $scale * 0.95, $scale * 0.95)
    $g.DrawArc($arcPen, $arcRect, 190, 160)
    $arcPen.Dispose()

    # Inner circular badge
    $innerBadgeRect = [System.Drawing.RectangleF]::new($center - $innerRadius * 0.76, $center - $innerRadius * 0.76, $scale * 0.76, $scale * 0.76)
    $badgeBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 20, 24, 32))
    $g.FillEllipse($badgeBrush, $innerBadgeRect)
    $badgeBrush.Dispose()

    # Car / Wrench graphic center
    # Draw sleek automotive wings & "P" monogram
    $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
    $fontSize = [float]($size * 0.28)
    $font = [System.Drawing.Font]::new($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    # Glow / shadow behind letter Z
    $glowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(120, 200, 69, 43))
    $g.DrawString("Z", $font, $glowBrush, [float]$center, [float]($center * 0.90 + 3), $format)
    $glowBrush.Dispose()

    # Golden brass letter Z
    $goldBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 247, 241, 227))
    $g.DrawString("Z", $font, $goldBrush, [float]$center, [float]($center * 0.90), $format)
    $goldBrush.Dispose()
    $font.Dispose()

    # Subtle banner "ZZZ GARAGE" at bottom of badge
    $subFontSize = [float]($size * 0.065)
    $subFont = [System.Drawing.Font]::new($fontFamily, $subFontSize, [System.Drawing.FontStyle]::Bold)
    $accentBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 200, 168, 107))
    $g.DrawString("ZZZ GARAGE", $subFont, $accentBrush, [float]$center, [float]($center * 1.34), $format)
    $accentBrush.Dispose()
    $subFont.Dispose()

    # Save to PNG
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Generated: $outputPath ($size x $size)"
}

# Generate 192x192
Generate-AppIcon -size 192 -outputPath (Join-Path $publicIconsDir "icon-192.png")

# Generate 512x512
Generate-AppIcon -size 512 -outputPath (Join-Path $publicIconsDir "icon-512.png")

# Generate 512x512 Maskable (Android Adaptive Icon)
Generate-AppIcon -size 512 -outputPath (Join-Path $publicIconsDir "icon-maskable.png") -isMaskable $true

# Generate Apple Touch Icon 180x180
Generate-AppIcon -size 180 -outputPath (Join-Path $publicIconsDir "apple-touch-icon.png")

# Generate Favicon 48x48
Generate-AppIcon -size 48 -outputPath (Join-Path $publicIconsDir "favicon-48.png")
