import Foundation

/// 일기 본문에서 자주 등장하는 단어를 뽑습니다. 조사와 흔한 어미를 떼어내는 가벼운 규칙 기반입니다.
enum KeywordExtractor {
    private static let particles = [
        "에서는", "에게서", "으로는", "이랑", "에서", "에게", "까지", "부터", "처럼", "보다",
        "으로", "하고", "한테", "이나", "이는", "은", "는", "이", "가", "을", "를", "에",
        "와", "과", "도", "로", "의", "랑", "만", "께", "한", "하게", "했던", "하는"
    ]

    private static let predicateEndings = [
        "었다", "았다", "했다", "였다", "겠다", "어요", "아요", "해요", "했어", "었어", "았어",
        "니다", "네요", "는데", "지만", "면서", "해서", "어서", "아서", "같다", "싶다", "좋다",
        "했고", "었고", "았고", "어야", "아야", "겠어", "자고", "려고", "는지", "을까", "ㄹ까"
    ]

    private static let stemEndings: [Character] = ["있", "없", "했", "었", "았", "겠", "되", "하", "였"]

    private static let stopwords: Set<String> = [
        "오늘", "그리고", "그래서", "하지만", "그런데", "정말", "너무", "진짜", "조금", "많이",
        "그냥", "이런", "그런", "저런", "우리", "나는", "내가", "하루", "다시", "계속", "아직",
        "이제", "모두", "같이", "함께", "어제", "내일", "요즘", "다들", "그게", "이게", "뭔가",
        "the", "and"
    ]

    static func top(_ texts: [String], limit: Int = 10) -> [(word: String, count: Int)] {
        var counts: [String: Int] = [:]

        for text in texts {
            var seen = Set<String>()
            let tokens = text.lowercased().components(separatedBy: CharacterSet.alphanumerics.inverted)
            for raw in tokens where raw.count >= 2 {
                if predicateEndings.contains(where: { raw.hasSuffix($0) }) { continue }

                var word = raw
                for particle in particles where word.hasSuffix(particle) && word.count - particle.count >= 2 {
                    word = String(word.dropLast(particle.count))
                    break
                }

                guard word.count >= 2,
                      let last = word.last, !stemEndings.contains(last),
                      !stopwords.contains(word),
                      !word.allSatisfy(\.isNumber)
                else { continue }

                if seen.insert(word).inserted {
                    counts[word, default: 0] += 1
                }
            }
        }

        return counts
            .sorted { $0.value != $1.value ? $0.value > $1.value : $0.key < $1.key }
            .prefix(limit)
            .map { (word: $0.key, count: $0.value) }
    }
}
