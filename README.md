# ExpressChat

**Express + Socket.IO + MongoDB** 기반의 실시간 채팅 애플리케이션입니다.  
1:1 Private Chat(DM) 기능과 채팅방 기능을 지원합니다.

---

## 주요 기능

- 실시간 채팅 (Socket.IO)
- 채팅방 생성 및 입장
- 입장/퇴장 알림
- 1:1 Private Chat (MongoDB 연동)
- 메시지 영구 저장 및 불러오기
- Mustache 기반 메시지 UI 렌더링

---

## 기술 스택

- **Backend**: Node.js, Express, Socket.IO
- **Database**: MongoDB
- **Template Engine**: Mustache
- **Frontend**: Next.js

---

## 프로젝트 구조

```
/express-chat
  /src
    /public        # 클라이언트 정적 리소스
    /views         # Mustache 템플릿
    /server        # Express + Socket.IO 서버 로직
    /db            # MongoDB 관련 코드
  package.json
```

## 향후 계획

- 채팅 기록 검색 기능 추가
- 알림(Notification) 시스템 연동 - fcm
- 소셜 로그인(OAuth) 연동
- 그룹 채팅 확장
- Docker 이미지로 변경
- 패스트캠퍼스 에러...
