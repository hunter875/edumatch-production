# Toast Notification Usage Guide

Dự án này có **3 hệ thống toast notification** đã được tích hợp và sẵn sàng sử dụng:

## 1. 🔥 React Hot Toast (Đơn giản, phổ biến)

### Import
```typescript
import { toast } from 'react-hot-toast';
```

### Cách sử dụng
```typescript
// Success
toast.success('Thành công!');

// Error
toast.error('Có lỗi xảy ra!');

// Loading
const toastId = toast.loading('Đang xử lý...');
// Sau đó cập nhật
toast.success('Hoàn thành!', { id: toastId });

// Custom
toast('Thông báo tùy chỉnh', {
  icon: '👏',
  duration: 4000,
});

// Promise
toast.promise(
  saveData(),
  {
    loading: 'Đang lưu...',
    success: 'Lưu thành công!',
    error: 'Lưu thất bại!',
  }
);
```

---

## 2. 🎵 Sonner (Hiện đại, đẹp)

### Import
```typescript
import { toast } from 'sonner';
```

### Cách sử dụng
```typescript
// Success
toast.success('Đã lưu thành công');

// Error
toast.error('Không thể xóa');

// Info
toast.info('Có thông tin mới');

// Warning
toast.warning('Cảnh báo!');

// Loading
toast.loading('Đang tải dữ liệu...');

// With description
toast.success('Thành công', {
  description: 'Dữ liệu của bạn đã được lưu',
});

// With action button
toast('Có tin nhắn mới', {
  action: {
    label: 'Xem',
    onClick: () => console.log('Clicked'),
  },
});

// Promise
toast.promise(fetchData(), {
  loading: 'Đang tải...',
  success: (data) => `${data.name} đã được tải`,
  error: 'Lỗi khi tải dữ liệu',
});
```

---

## 3. 🎨 Custom Toast (Tùy chỉnh hoàn toàn)

### Import
```typescript
import { useToast, toast } from '@/hooks/useToast';
```

### Cách sử dụng trong Component
```typescript
function MyComponent() {
  const { success, error, warning, info } = useToast();
  
  const handleClick = () => {
    success('Thao tác thành công!', 'Hoàn thành');
    error('Có lỗi xảy ra!', 'Lỗi');
    warning('Cảnh báo!', 'Chú ý');
    info('Thông tin', 'Ghi chú');
  };
  
  return <button onClick={handleClick}>Show Toast</button>;
}
```

### Cách sử dụng ngoài Component
```typescript
// Trong file utility, service, etc.
import { toast } from '@/hooks/useToast';

toast.success('Đăng nhập thành công!', 'Chào mừng');
toast.error('Đăng nhập thất bại!', 'Lỗi');
toast.warning('Phiên đăng nhập sắp hết hạn', 'Cảnh báo');
toast.info('Có 3 thông báo mới', 'Thông báo');
```

---

## 🎯 Khuyến nghị sử dụng

### Dùng **Sonner** cho:
- ✅ UI đẹp, hiện đại
- ✅ Toast phức tạp với action buttons
- ✅ Promise toast với loading states
- ✅ Dự án mới hoặc refactor

### Dùng **React Hot Toast** cho:
- ✅ Đơn giản, dễ sử dụng
- ✅ Tích hợp nhanh
- ✅ Đã quen thuộc với thư viện

### Dùng **Custom Toast** cho:
- ✅ Cần tùy chỉnh hoàn toàn
- ✅ Matching với design system riêng
- ✅ Không muốn dependency bên ngoài

---

## 📍 Vị trí hiển thị

Tất cả toast đều hiển thị ở **góc trên bên phải** màn hình với thứ tự:
1. Custom Toast (z-index: 9999)
2. React Hot Toast (position: top-right)
3. Sonner Toast (position: top-right)

---

## 🎨 Styling

Tất cả toast đã được styling với:
- ✅ Màu sắc phù hợp cho từng loại (success/error/warning/info)
- ✅ Icons đẹp
- ✅ Animation mượt mà
- ✅ Responsive
- ✅ Dark/Light mode ready (nếu cần)

---

## 📝 Ví dụ thực tế

### Login Success
```typescript
import { toast } from 'sonner';

const handleLogin = async (email: string, password: string) => {
  toast.promise(
    loginAPI(email, password),
    {
      loading: 'Đang đăng nhập...',
      success: (user) => `Chào mừng ${user.name}!`,
      error: 'Email hoặc mật khẩu không đúng',
    }
  );
};
```

### Delete Confirmation
```typescript
import { toast } from 'sonner';

const handleDelete = (id: string) => {
  toast('Bạn có chắc muốn xóa?', {
    action: {
      label: 'Xóa',
      onClick: async () => {
        await deleteAPI(id);
        toast.success('Đã xóa thành công');
      },
    },
    cancel: {
      label: 'Hủy',
      onClick: () => toast.info('Đã hủy'),
    },
  });
};
```

### Form Submission
```typescript
import { toast } from 'react-hot-toast';

const handleSubmit = async (data: FormData) => {
  const toastId = toast.loading('Đang gửi form...');
  
  try {
    await submitForm(data);
    toast.success('Gửi form thành công!', { id: toastId });
  } catch (error) {
    toast.error('Lỗi khi gửi form', { id: toastId });
  }
};
```

---

## 🔧 Configuration

Các toast đã được config tại `frontend/src/app/layout.tsx`:

- **React Hot Toast**: Duration 5s, custom colors
- **Sonner**: Rich colors, custom styling
- **Custom Toast**: Z-index cao nhất, position top-right

---

## ⚠️ Lưu ý

1. **Không nên show quá nhiều toast cùng lúc** - Người dùng sẽ bị overwhelm
2. **Duration hợp lý** - 3-5 giây cho thông báo thường, loading toast không timeout
3. **Message rõ ràng** - Ngắn gọn, súc tích, dễ hiểu
4. **Icon phù hợp** - Đúng với loại thông báo

---

## 🚀 Ready to use!

Tất cả 3 hệ thống toast đã được tích hợp vào dự án và sẵn sàng sử dụng!
