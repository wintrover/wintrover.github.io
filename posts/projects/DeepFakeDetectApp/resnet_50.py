import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models, transforms
from torch.utils.data import Dataset, DataLoader
from PIL import Image
from sklearn.model_selection import train_test_split
from tqdm import tqdm  # tqdm 라이브러리 추가

# 하이퍼파라미터 설정
BATCH_SIZE = 32
EPOCHS = 3
LEARNING_RATE = 0.001

# 데이터셋 경로 설정
dataset_path = "C:\\Users\\wintr\\.cache\\kagglehub\\datasets\\greatgamedota\\faceforensics\\versions\\1"
CROPPED_IMAGES_DIR = os.path.join(dataset_path, "cropped_images")

# 커스텀 데이터셋 클래스 정의
class FaceForensicsDataset(Dataset):
    def __init__(self, cropped_dir, transform=None):
        self.transform = transform
        self.image_paths = []
        self.labels = []

        print("데이터셋 초기화 중...")
        for subdir in os.listdir(cropped_dir):
            subdir_path = os.path.join(cropped_dir, subdir)
            if os.path.isdir(subdir_path):  # 하위 디렉토리 확인
                for img_name in os.listdir(subdir_path):
                    img_path = os.path.join(subdir_path, img_name)
                    
                    # 레이블 할당 (예시: 디렉토리 이름에 따라 진짜/가짜 구분)
                    if subdir.startswith("000"):  # 진짜 이미지로 가정
                        label = 0  # 0: Real
                    else:
                        label = 1  # 1: Fake
                    
                    self.image_paths.append(img_path)
                    self.labels.append(label)
        
        print(f"총 {len(self.image_paths)}개의 이미지 로드 완료.")

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        label = self.labels[idx]

        image = Image.open(img_path).convert("RGB")

        if self.transform:
            image = self.transform(image)

        return image, label

# 데이터 전처리 및 변환
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# 데이터셋 및 데이터로더 생성
full_dataset = FaceForensicsDataset(cropped_dir=CROPPED_IMAGES_DIR, transform=transform)
train_indices, test_indices = train_test_split(range(len(full_dataset)), test_size=0.2, random_state=42)

train_dataset = torch.utils.data.Subset(full_dataset, train_indices)
test_dataset = torch.utils.data.Subset(full_dataset, test_indices)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE)

# 모델 정의 (ResNet-50 기반)
model = models.resnet50(pretrained=True)
num_ftrs = model.fc.in_features
model.fc = nn.Linear(num_ftrs, 2)  # 2 classes: Real/Fake

# GPU 설정
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)

# 손실 함수 및 옵티마이저
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

# 학습 함수 (tqdm 적용)
def train_model():
    model.train()
    for epoch in range(EPOCHS):
        running_loss = 0.0
        correct = 0
        total = 0
        
        # tqdm으로 진행률 표시
        with tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS}", leave=False) as t:
            for inputs, labels in t:
                inputs, labels = inputs.to(device), labels.to(device)
                
                optimizer.zero_grad()
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
                
                # 손실 및 정확도 계산
                running_loss += loss.item()
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
                
                # tqdm 진행률 바 업데이트
                t.set_postfix(loss=loss.item(), accuracy=100 * correct / total)
        
        # 에포크별 학습 결과 출력
        train_loss = running_loss / len(train_loader)
        train_accuracy = 100 * correct / total
        print(f'Epoch {epoch+1}/{EPOCHS} - Train Loss: {train_loss:.4f}, Train Accuracy: {train_accuracy:.2f}%')
        
        # 테스트 데이터셋에서 성능 평가
        test_model()

# 테스트 함수 (tqdm 적용)
def test_model():
    model.eval()
    correct = 0
    total = 0
    
    # tqdm으로 진행률 표시
    with tqdm(test_loader, desc="Testing", leave=False) as t:
        with torch.no_grad():
            for inputs, labels in t:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
                
                # tqdm 진행률 바 업데이트
                t.set_postfix(accuracy=100 * correct / total)
    
    test_accuracy = 100 * correct / total
    print(f'Test Accuracy: {test_accuracy:.2f}%\n')

if __name__ == '__main__':
    train_model()