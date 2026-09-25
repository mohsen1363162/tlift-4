#!/usr/bin/env python3
import os
import zipfile

def make_zip(source_dir, output_files):
    if not os.path.exists(source_dir):
        print(f"Error: {source_dir} does not exist")
        return False

    for out_path in output_files:
        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
        # Temp file to avoid partial or locked writes
        tmp_path = out_path + ".tmp"
        with zipfile.ZipFile(tmp_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
            for root, dirs, files in os.walk(source_dir):
                for file in files:
                    if file.endswith('.zip') or file.endswith('.tmp'):
                        continue
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, source_dir)
                    zipf.write(full_path, rel_path)
        os.replace(tmp_path, out_path)
        size_kb = round(os.path.getsize(out_path) / 1024)
        print(f"Created {out_path} ({size_kb} KB)")
    return True

if __name__ == "__main__":
    # یک فایل فشردهٔ واحد برای خروجی سی‌پنل (لینک‌های دیگر به همین فایل اشاره می‌کنند)
    make_zip('dist', [
        'public/public_html.zip'
    ])
