// Vẽ icon/splash PNG của VietBank bằng GDI+ (System.Drawing, có sẵn trên Windows).
// Đọc file spec do scripts/generate-brand-assets.mjs sinh ra:
//   PART|level|paint|evenodd/nonzero|path SVG   (hình học logo, khung 100×100)
//   JOB|file ra|cỡ khung|nền từ|nền tới|level|cỡ logo|màu đồng tiền
// Path SVG chỉ gồm M/L/H/V/C/Z tuyệt đối và A là nửa đường tròn theo chiều kim đồng hồ.
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.Text.RegularExpressions;

public static class BrandRenderer
{
    private class Part
    {
        public string Level;
        public string Paint;
        public bool EvenOdd;
        public string D;
    }

    private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    public static void Run(string specPath)
    {
        var parts = new List<Part>();
        var jobs = new List<string[]>();
        foreach (var raw in File.ReadAllLines(specPath))
        {
            if (raw.Length == 0) continue;
            var f = raw.Split('|');
            if (f[0] == "PART")
            {
                parts.Add(new Part { Level = f[1], Paint = f[2], EvenOdd = f[3] == "evenodd", D = f[4] });
            }
            else if (f[0] == "JOB")
            {
                jobs.Add(f);
            }
        }
        foreach (var job in jobs)
        {
            Render(job, parts);
            Console.WriteLine("  " + Path.GetFileName(job[1]));
        }
    }

    private static void Render(string[] j, List<Part> all)
    {
        string outPath = j[1];
        int canvas = int.Parse(j[2], Inv);
        string level = j[5];
        float mark = float.Parse(j[6], Inv);
        Color coin = Hex(j[7]);
        var parts = all.FindAll(p => p.Level == level);

        using (var bmp = new Bitmap(canvas, canvas, PixelFormat.Format32bppArgb))
        {
            using (var g = Graphics.FromImage(bmp))
            {
                Setup(g);
                g.Clear(Color.Transparent);
                if (j[3] != "-")
                {
                    using (var bg = new LinearGradientBrush(new PointF(0, -1), new PointF(0, canvas + 1), Hex(j[3]), Hex(j[4])))
                    {
                        g.FillRectangle(bg, 0, 0, canvas, canvas);
                    }
                }
                if (mark > 0)
                {
                    Place(g, canvas, mark);
                    foreach (var p in parts) Draw(g, p, coin);
                }
            }
            bmp.Save(outPath, ImageFormat.Png);
        }
    }

    // Đặt khung logo 100×100 vào giữa ảnh với cỡ `mark` pixel.
    private static void Place(Graphics g, int canvas, float mark)
    {
        float offset = (canvas - mark) / 2f;
        g.TranslateTransform(offset, offset);
        g.ScaleTransform(mark / 100f, mark / 100f);
    }

    private static void Setup(Graphics g)
    {
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        g.CompositingQuality = CompositingQuality.HighQuality;
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
    }

    // Lỗ vuông của đồng tiền đục bằng evenodd (FillMode.Alternate) nên trong suốt, thấy nền phía sau.
    private static void Draw(Graphics g, Part p, Color coin)
    {
        if (p.Paint != "coin") throw new FormatException("Màu tô không hỗ trợ: " + p.Paint);
        using (var path = BuildPath(p.D, p.EvenOdd))
        using (var b = new SolidBrush(coin))
        {
            g.FillPath(b, path);
        }
    }

    private static GraphicsPath BuildPath(string d, bool evenOdd)
    {
        var path = new GraphicsPath(evenOdd ? FillMode.Alternate : FillMode.Winding);
        MatchCollection tokens = Regex.Matches(d, @"[MLHVCAZ]|-?\d*\.?\d+(?:[eE][-+]?\d+)?");
        int i = 0;
        float cx = 0, cy = 0, sx = 0, sy = 0;
        char cmd = ' ';
        Func<float> num = () => float.Parse(tokens[i++].Value, Inv);
        while (i < tokens.Count)
        {
            string t = tokens[i].Value;
            if (char.IsLetter(t[0])) { cmd = t[0]; i++; }
            switch (cmd)
            {
                case 'M':
                    cx = num(); cy = num(); sx = cx; sy = cy;
                    path.StartFigure();
                    break;
                case 'L':
                {
                    float x = num(), y = num();
                    path.AddLine(cx, cy, x, y); cx = x; cy = y;
                    break;
                }
                case 'H':
                {
                    float x = num();
                    path.AddLine(cx, cy, x, cy); cx = x;
                    break;
                }
                case 'V':
                {
                    float y = num();
                    path.AddLine(cx, cy, cx, y); cy = y;
                    break;
                }
                case 'C':
                {
                    float x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
                    path.AddBezier(cx, cy, x1, y1, x2, y2, x, y); cx = x; cy = y;
                    break;
                }
                case 'A':
                {
                    // Chỉ hỗ trợ nửa đường tròn (rx = ry, sweep = 1): tâm là trung điểm hai đầu mút.
                    float r = num(); num(); num(); num(); num();
                    float x = num(), y = num();
                    float mx = (cx + x) / 2, my = (cy + y) / 2;
                    float start = (float)(Math.Atan2(cy - my, cx - mx) * 180 / Math.PI);
                    path.AddArc(mx - r, my - r, 2 * r, 2 * r, start, 180); cx = x; cy = y;
                    break;
                }
                case 'Z':
                    path.CloseFigure(); cx = sx; cy = sy;
                    break;
                default:
                    throw new FormatException("Lệnh path không hỗ trợ: " + cmd);
            }
        }
        return path;
    }

    private static Color Hex(string value)
    {
        return ColorTranslator.FromHtml(value);
    }
}
