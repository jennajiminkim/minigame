# Recorder King

30초 리코더 리듬게임 초안입니다.

## 실행 방법

1. 압축을 풉니다.
2. `index.html`을 브라우저에서 엽니다.
3. `START CONCERT`를 누르면 커튼이 열리며 플레이가 시작됩니다.

## 조작키

- A: 도
- S: 레
- D: 미
- F: 파
- G: 솔
- H: 라
- J: 시
- K: 높은 도

## 적용 내용

- 곡: Mozart 〈Queen of the Night Aria〉의 유명한 고음 파트를 8키 도레미 안에서 단순화한 게임용 리코더 멜로디
- 배경: `piro4d-moon-2245743.jpg`
- 캐릭터: `hoo-rook-recorder.png`
- 외부 음원 없이 Web Audio로 리코더 음, 삑사리, 바람 빠지는 소리를 생성
- 30초 안에 결과 화면 표시
- 정확도 70% 이상이면 SUCCESS
- EASY / NORMAL / HARD 난이도 지원
- 최고 점수, 마지막 난이도, 음소거, 모션 설정을 localStorage에 저장
- 저장값이 손상되면 기본값으로 복구
