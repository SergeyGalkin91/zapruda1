#!/usr/bin/env python3
"""Apply remaining react-hooks/exhaustive-deps patches on the current tree."""
from __future__ import annotations

import subprocess
from pathlib import Path


def show(path: str, ref: str = "origin/release/v0.7.0-alpha") -> str:
    return subprocess.check_output(["git", "show", f"{ref}:{path}"], text=True)


def main() -> None:
    # GEAR — restore if placeholder, then fix deps
    gear_path = Path("src/components/AnglerGearSets.tsx")
    gear = gear_path.read_text()
    if "PLACEHOLDER" in gear or len(gear) < 500:
        gear = show("src/components/AnglerGearSets.tsx")
    gear = gear.replace(
        "}, [items, selectedRod, selectedReel, selectedLine]);",
        "}, [items, rods, reels, lines, selectedRod, selectedReel, selectedLine]);",
    )
    if "rods, reels, lines" not in gear:
        raise SystemExit("gear patch failed")
    gear_path.write_text(gear)
    print("gear ok")

    # AUTH
    auth_path = Path("src/routes/auth.tsx")
    auth = auth_path.read_text()
    old_auth = (
        "    return () => { active = false; subscription.unsubscribe(); };\n"
        "  }, []);\n"
        "\n"
        "  useEffect(() => {\n"
        '    if (mode === "in" || mode === "up") setMode(search.mode);\n'
        "  }, [search.mode]);\n"
    )
    new_auth = (
        "    return () => { active = false; subscription.unsubscribe(); };\n"
        "  }, [navigate]);\n"
        "\n"
        "  useEffect(() => {\n"
        "    // Sync URL mode only while user is on in/up forms (not forgot/recovery).\n"
        '    setMode((current) => (current === "in" || current === "up" ? search.mode : current));\n'
        "  }, [search.mode]);\n"
    )
    if "}, [navigate]);" in auth and "setMode((current)" in auth:
        print("auth already")
    else:
        if old_auth not in auth:
            auth = show("src/routes/auth.tsx")
        if old_auth not in auth:
            raise SystemExit("auth pattern missing")
        auth_path.write_text(auth.replace(old_auth, new_auth))
        print("auth patched")

    # MARKS
    marks_path = Path("src/components/PrivateFishingMarks.tsx")
    marks = marks_path.read_text()
    if "const refresh = useCallback" in marks:
        print("marks already")
    else:
        if "PLACEHOLDER" in marks or len(marks) < 200:
            marks = show("src/components/PrivateFishingMarks.tsx")
        if "useCallback" not in marks:
            marks = marks.replace(
                'import { useEffect, useState } from "react";',
                'import { useCallback, useEffect, useState } from "react";',
            )
        old_marks = (
            "  async function refresh() {\n"
            '    const { data, error: queryError } = await supabase.from("private_fishing_marks")\n'
            '      .select("id,kind,title,note,latitude,longitude,created_at")\n'
            '      .eq("user_id", userId).order("created_at", { ascending: false }).limit(100);\n'
            '    if (queryError) setError("Не удалось загрузить личные метки: " + queryError.message);\n'
            "    else setMarks((data ?? []) as Mark[]);\n"
            "    setLoading(false);\n"
            "  }\n"
            "\n"
            "  useEffect(() => { void refresh(); }, [userId]);\n"
        )
        new_marks = (
            "  const refresh = useCallback(async () => {\n"
            '    const { data, error: queryError } = await supabase.from("private_fishing_marks")\n'
            '      .select("id,kind,title,note,latitude,longitude,created_at")\n'
            '      .eq("user_id", userId).order("created_at", { ascending: false }).limit(100);\n'
            '    if (queryError) setError("Не удалось загрузить личные метки: " + queryError.message);\n'
            "    else setMarks((data ?? []) as Mark[]);\n"
            "    setLoading(false);\n"
            "  }, [userId]);\n"
            "\n"
            "  useEffect(() => { void refresh(); }, [refresh]);\n"
        )
        if old_marks not in marks:
            raise SystemExit("marks pattern missing")
        marks_path.write_text(marks.replace(old_marks, new_marks))
        print("marks patched")

    # INDEX
    index_path = Path("src/routes/index.tsx")
    index = index_path.read_text()
    old_index = (
        "  }, [hasMore, loadingMore, reports.length]);\n"
        "\n"
        "  useEffect(() => { void loadPage(true); }, []);\n"
    )
    new_index = (
        "  }, [hasMore, loadingMore, reports.length]);\n"
        "\n"
        "  const loadPageRef = useRef(loadPage);\n"
        "  loadPageRef.current = loadPage;\n"
        "\n"
        "  // One-shot initial fetch; infinite scroll / realtime use loadPage via deps below.\n"
        "  useEffect(() => { void loadPageRef.current(true); }, []);\n"
    )
    if "loadPageRef" in index:
        print("index already")
    else:
        if old_index not in index:
            index = show("src/routes/index.tsx")
        if old_index not in index:
            raise SystemExit("index pattern missing")
        index_path.write_text(index.replace(old_index, new_index))
        print("index patched")

    # CHAT
    chat_path = Path("src/routes/chat.tsx")
    chat = chat_path.read_text()
    if (
        "if (!uid || !placeId || !threadOpen) return;" in chat
        and "[uid, placeId, topic, refreshIndex, threadOpen]" in chat
    ):
        print("chat already")
    else:
        if "PLACEHOLDER" in chat or len(chat) < 500:
            chat = show("src/routes/chat.tsx")
        chat = chat.replace(
            "  useEffect(() => {\n    if (!uid || !selectedPlace || !threadOpen) return;\n",
            "  useEffect(() => {\n    if (!uid || !placeId || !threadOpen) return;\n",
        )
        chat = chat.replace(
            '.eq("place_id", selectedPlace.id).eq("topic", topic)',
            '.eq("place_id", placeId).eq("topic", topic)',
        )
        chat = chat.replace(
            'const channel = supabase.channel("zapruda-chat-" + selectedPlace.id + "-" + topic)',
            'const channel = supabase.channel("zapruda-chat-" + placeId + "-" + topic)',
        )
        chat = chat.replace(
            'filter: "place_id=eq." + selectedPlace.id,',
            'filter: "place_id=eq." + placeId,',
        )
        chat = chat.replace(
            "}, [uid, selectedPlace?.id, topic, refreshIndex, threadOpen]);",
            "}, [uid, placeId, topic, refreshIndex, threadOpen]);",
        )
        if "if (!uid || !placeId || !threadOpen) return;" not in chat:
            raise SystemExit("chat patch failed")
        chat_path.write_text(chat)
        print("chat patched")

    print("ALL PATCHES DONE")


if __name__ == "__main__":
    main()
