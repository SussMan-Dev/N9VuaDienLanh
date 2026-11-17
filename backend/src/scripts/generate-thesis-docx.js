/**
 * Graduation Thesis Master Document Generator (.docx)
 * Topic: "XÂY DỰNG HỆ THỐNG QUẢN LÝ DỊCH VỤ SỬA CHỮA ĐIỆN MÁY & ĐIỆN LẠNH TOÀN DIỆN — VUA SỬA CHỮA"
 * 
 * Features:
 * - Formal Academic Cover Page & Front Matter
 * - Chapter 1: Introduction & Domain Analysis
 * - Chapter 2: Requirement Analysis & Detailed Use Case Tables + Standard Enterprise UML Diagrams (No Emojis)
 * - Chapter 3: System Architecture, Activity Diagrams (10-Stage Swimlane, Quote Flow, Atomic Parts Flow) & Enterprise UML Class Diagram (OMG Standard, 3 compartments, exact types, multiplicities)
 * - Chapter 4: System Implementation & UI Walkthrough (9 Live Web Screenshots + 12 Mobile Smartphone Frames)
 * - Chapter 5: Testing, Evaluation & Conclusion
 * - References
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  HeadingLevel,
  PageBreak,
  BorderStyle,
  Header,
  Footer,
  PageNumber
} from 'docx';
import fs from 'fs';
import path from 'path';

const ASSETS_DIR = path.resolve('../docs/dist/assets/thesis');
const OUTPUT_FILE = path.resolve('../docs/dist/DO_AN_TOT_NGHIEP_VUA_SUA_CHUA.docx');

// --- Helper Functions for Formatting ---

function createTitleParagraph(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 280, after: 140 },
  });
}

function createParagraph(text, options = {}) {
  return new Paragraph({
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 80, line: 300 },
    children: [
      new TextRun({
        text,
        font: 'Times New Roman',
        size: 26, // 13pt
        bold: options.bold || false,
        italics: options.italics || false,
        color: options.color || '1E293B',
      })
    ]
  });
}

function createBullet(text, boldPrefix = '') {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({ text: boldPrefix + ' ', font: 'Times New Roman', size: 26, bold: true, color: '0F172A' }));
  }
  children.push(new TextRun({ text, font: 'Times New Roman', size: 26, color: '1E293B' }));

  return new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 40, after: 40, line: 280 },
    children
  });
}

function createImageCaption(captionText) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 180 },
    children: [
      new TextRun({
        text: captionText,
        font: 'Times New Roman',
        size: 24, // 12pt
        bold: true,
        italics: true,
        color: '0369A1'
      })
    ]
  });
}

function insertImage(imageFilename, width = 560, height = 340, caption = '') {
  const imagePath = path.join(ASSETS_DIR, imageFilename);
  if (!fs.existsSync(imagePath)) {
    console.warn(`[Warning] Image not found: ${imagePath}`);
    return [createParagraph(`[Hình ảnh: ${imageFilename} không tìm thấy]`, { italics: true })];
  }
  const imgData = fs.readFileSync(imagePath);

  const elements = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 140, after: 60 },
      children: [
        new ImageRun({
          data: imgData,
          transformation: { width, height }
        })
      ]
    })
  ];

  if (caption) {
    elements.push(createImageCaption(caption));
  }
  return elements;
}

// Table cell builder
function cell(text, options = {}) {
  return new TableCell({
    shading: options.shading ? { fill: options.shading } : undefined,
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    },
    children: [
      new Paragraph({
        alignment: options.alignment || AlignmentType.LEFT,
        spacing: { before: 20, after: 20 },
        children: [
          new TextRun({
            text: String(text || ''),
            font: 'Times New Roman',
            size: options.size || 22, // 11pt
            bold: options.bold || false,
            color: options.color || '0F172A'
          })
        ]
      })
    ]
  });
}

// Table header row builder
function headerRow(headers, widths) {
  return new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, {
      bold: true,
      color: 'FFFFFF',
      shading: '0284C7',
      alignment: AlignmentType.CENTER,
      width: widths ? widths[i] : undefined,
      size: 23
    }))
  });
}

// Standard Use Case Table Builder
function buildUseCaseTable(ucId, ucName, actor, pre, post, mainFlow, altFlow) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell('Mã Use Case:', { bold: true, width: 25, shading: 'F1F5F9' }),
          cell(ucId, { bold: true, width: 75, color: '0369A1' })
        ]
      }),
      new TableRow({
        children: [
          cell('Tên Use Case:', { bold: true, shading: 'F1F5F9' }),
          cell(ucName, { bold: true })
        ]
      }),
      new TableRow({
        children: [
          cell('Tác nhân (Actor):', { bold: true, shading: 'F1F5F9' }),
          cell(actor)
        ]
      }),
      new TableRow({
        children: [
          cell('Tiền điều kiện (Pre-conditions):', { bold: true, shading: 'F1F5F9' }),
          cell(pre)
        ]
      }),
      new TableRow({
        children: [
          cell('Hậu điều kiện (Post-conditions):', { bold: true, shading: 'F1F5F9' }),
          cell(post)
        ]
      }),
      new TableRow({
        children: [
          cell('Luồng sự kiện chính (Main Flow):', { bold: true, shading: 'F1F5F9' }),
          cell(mainFlow)
        ]
      }),
      new TableRow({
        children: [
          cell('Luồng ngoại lệ (Alternative Flow):', { bold: true, shading: 'F1F5F9' }),
          cell(altFlow)
        ]
      })
    ]
  });
}

async function generateDocx() {
  console.log('--- GENERATING MASTER GRADUATION THESIS DOCX (EXPANDED) ---');

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 26, color: '1E293B' },
          paragraph: { spacing: { line: 300 } }
        }
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: { font: 'Times New Roman', size: 36, bold: true, color: '0284C7' },
          paragraph: { spacing: { before: 360, after: 180 } }
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: { font: 'Times New Roman', size: 30, bold: true, color: '0F172A' },
          paragraph: { spacing: { before: 240, after: 120 } }
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          run: { font: 'Times New Roman', size: 26, bold: true, italics: true, color: '334155' },
          paragraph: { spacing: { before: 180, after: 90 } }
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1700, right: 1440 }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'ĐỒ ÁN TỐT NGHIỆP: HỆ THỐNG VUA SỬA CHỮA (WEB & MOBILE)',
                    font: 'Times New Roman',
                    size: 18,
                    italics: true,
                    color: '94A3B8'
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Trang ',
                    font: 'Times New Roman',
                    size: 20,
                    color: '64748B'
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'Times New Roman',
                    size: 20,
                    bold: true,
                    color: '0284C7'
                  })
                ]
              })
            ]
          })
        },
        children: [
          // ==================== TRANG BÌA ====================
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({ text: 'BỘ GIÁO DỤC VÀ ĐÀO TẠO\n', font: 'Times New Roman', size: 26, bold: true, color: '0F172A' }),
              new TextRun({ text: 'TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG\n', font: 'Times New Roman', size: 26, bold: true, color: '0F172A' }),
              new TextRun({ text: 'KHOA KỸ THUẬT PHẦN MỀM', font: 'Times New Roman', size: 24, bold: true, color: '0369A1' })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 100 },
            children: [
              new TextRun({ text: '-------------------***-------------------', font: 'Times New Roman', size: 22, color: '94A3B8' })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({ text: 'ĐỒ ÁN TỐT NGHIỆP ĐẠI HỌC\n', font: 'Times New Roman', size: 36, bold: true, color: '0F172A' }),
              new TextRun({ text: 'CHUYÊN NGÀNH: KỸ THUẬT PHẦN MỀM\n', font: 'Times New Roman', size: 26, bold: true, color: '475569' })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({
                text: 'ĐỀ TÀI:\n',
                font: 'Times New Roman',
                size: 28,
                bold: true,
                color: '64748B'
              }),
              new TextRun({
                text: 'XÂY DỰNG HỆ THỐNG QUẢN LÝ DỊCH VỤ SỬA CHỮA ĐIỆN MÁY & ĐIỆN LẠNH TOÀN DIỆN — "VUA SỬA CHỮA"\n',
                font: 'Times New Roman',
                size: 38,
                bold: true,
                color: '0284C7'
              }),
              new TextRun({
                text: '(Kiến trúc đa nền tảng Web Application & Mobile App)',
                font: 'Times New Roman',
                size: 26,
                italics: true,
                color: '334155'
              })
            ]
          }),

          new Paragraph({
            spacing: { before: 400, after: 200 },
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: 'Giảng viên hướng dẫn: ', font: 'Times New Roman', size: 26, bold: true }),
              new TextRun({ text: 'TS. Nguyễn Văn Hướng\n', font: 'Times New Roman', size: 26 }),
              new TextRun({ text: 'Sinh viên thực hiện:    ', font: 'Times New Roman', size: 26, bold: true }),
              new TextRun({ text: 'Nhóm Nghiên Cứu Phát Triển Dự Án\n', font: 'Times New Roman', size: 26 }),
              new TextRun({ text: 'Lớp:                           ', font: 'Times New Roman', size: 26, bold: true }),
              new TextRun({ text: 'Kỹ Thuật Phần Mềm K20\n', font: 'Times New Roman', size: 26 }),
              new TextRun({ text: 'Khóa học:                   ', font: 'Times New Roman', size: 26, bold: true }),
              new TextRun({ text: '2022 — 2026', font: 'Times New Roman', size: 26 })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({ text: 'HÀ NỘI — NĂM 2026', font: 'Times New Roman', size: 24, bold: true, color: '0F172A' })
            ]
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // ==================== LỜI CAM ĐOAN & LỜI CẢM ƠN ====================
          createTitleParagraph('LỜI CAM ĐOAN', HeadingLevel.HEADING_2),
          createParagraph('Tôi xin cam đoan đề tài "Xây dựng hệ thống quản lý dịch vụ sửa chữa điện máy & điện lạnh toàn diện — Vua Sửa Chữa (Nền tảng Web & Mobile App)" là công trình nghiên cứu và thực hiện nghiêm túc của nhóm tác giả dưới sự hướng dẫn trực tiếp của Giảng viên hướng dẫn.'),
          createParagraph('Toàn bộ các bảng đặc tả Use Case, biểu đồ lớp (Class Diagram) theo chuẩn công nghiệp, sơ đồ hoạt động (Activity Diagrams) và các hình ảnh chụp giao diện hệ thống Web và Mobile trong đồ án là hoàn toàn xác thực, phản ánh trung thực kết quả xây dựng mã nguồn và kiểm thử hệ thống.'),

          new Paragraph({ spacing: { before: 100, after: 100 } }),
          createTitleParagraph('LỜI CẢM ƠN', HeadingLevel.HEADING_2),
          createParagraph('Lời đầu tiên, nhóm tác giả xin bày tỏ lòng biết ơn sâu sắc đến quý Thầy Cô trong Khoa Kỹ thuật Phần mềm đã tận tình truyền đạt những kiến thức chuyên môn quý báu về kỹ nghệ phần mềm, phân tích thiết kế hệ thống hướng đối tượng và kiến trúc phân tán trong suốt quá trình học tập.'),
          createParagraph('Đặc biệt, nhóm xin chân thành cảm ơn Thầy hướng dẫn đã luôn định hướng phương pháp, đóng góp những phản biện chuyên môn thực tế và tạo điều kiện thuận lợi nhất để đồ án được hoàn thiện với chất lượng tốt nhất.'),

          new Paragraph({ children: [new PageBreak()] }),

          // ==================== BẢNG CHỮ VIẾT TẮT ====================
          createTitleParagraph('DANH MỤC TỪ VIẾT TẮT', HeadingLevel.HEADING_2),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(['Từ viết tắt', 'Thuật ngữ Tiếng Anh', 'Ý nghĩa Tiếng Việt'], [20, 45, 35]),
              new TableRow({ children: [cell('API'), cell('Application Programming Interface'), cell('Giao diện lập trình ứng dụng')] }),
              new TableRow({ children: [cell('REST'), cell('Representational State Transfer'), cell('Kiến trúc dịch vụ web chuẩn RESTful')] }),
              new TableRow({ children: [cell('JWT'), cell('JSON Web Token'), cell('Chuẩn xác thực phân quyền qua token')] }),
              new TableRow({ children: [cell('SPA'), cell('Single Page Application'), cell('Ứng dụng trang đơn (ReactJS)')] }),
              new TableRow({ children: [cell('KTV'), cell('Technician'), cell('Kỹ thuật viên sửa chữa hiện trường')] }),
              new TableRow({ children: [cell('UML'), cell('Unified Modeling Language'), cell('Ngôn ngữ mô hình hóa thống nhất (OMG)')] }),
              new TableRow({ children: [cell('ACID'), cell('Atomicity, Consistency, Isolation, Durability'), cell('4 thuộc tính giao dịch cơ sở dữ liệu')] }),
              new TableRow({ children: [cell('E2E'), cell('End-to-End Testing'), cell('Kiểm thử tích hợp đầu cuối toàn luồng')] }),
              new TableRow({ children: [cell('KPI'), cell('Key Performance Indicator'), cell('Chỉ số đo lường hiệu suất vận hành')] }),
              new TableRow({ children: [cell('FCM'), cell('Firebase Cloud Messaging'), cell('Hạ tầng đẩy thông báo di động')] }),
              new TableRow({ children: [cell('RBAC'), cell('Role-Based Access Control'), cell('Kiểm soát truy cập dựa trên vai trò')] })
            ]
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // ==================== CHƯƠNG 1 ====================
          createTitleParagraph('CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI & BÀI TOÁN THỰC TIỄN', HeadingLevel.HEADING_1),
          
          createTitleParagraph('1.1. Đặt vấn đề và tính cấp thiết của đề tài', HeadingLevel.HEADING_2),
          createParagraph('Trong bối cảnh nền kinh tế số và sự bùng nổ của các thiết bị điện máy, điện tử, điện gia dụng (máy lạnh, máy giặt, tủ lạnh, tivi, bình nóng lạnh, bếp từ...), nhu cầu bảo trì, sửa chữa và thay thế linh kiện tại nhà của người dân ngày càng gia tăng mạnh mẽ.'),
          createParagraph('Tuy nhiên, các trung tâm bảo hành và doanh nghiệp dịch vụ điện máy truyền thống hiện nay đang đối mặt với nhiều bất cập lớn:'),
          createBullet('Quy trình ghi nhận đơn hàng chủ yếu qua sổ sách hoặc bảng tính Excel phân tán, dễ thất lạc thông tin khách hàng và lịch sử lỗi của thiết bị.'),
          createBullet('Tình trạng "loạn giá" và thiếu minh bạch: Kỹ thuật viên báo giá trực tiếp bằng miệng cho khách mà không qua thẩm định của cấp quản lý, dẫn đến rủi ro tiêu cực và mất uy tín doanh nghiệp.'),
          createBullet('Quản lý kho vật tư lỏng lẻo: Linh kiện xuất kho không gắn liền với mã phiếu sửa chữa cụ thể, gây thất thoát vật tư và phát sinh tồn kho âm.'),
          createBullet('Khách hàng không theo dõi được tiến độ: Người dùng không biết thiết bị của mình đang ở giai đoạn nào, dẫn đến trải nghiệm dịch vụ kém.'),
          createParagraph('Chính vì vậy, việc nghiên cứu và xây dựng một "Hệ thống Quản lý Dịch vụ Sửa chữa Điện máy & Điện lạnh Toàn diện — Vua Sửa Chữa" trên cả hai nền tảng Web Application và Mobile App là vô cùng cấp thiết, mang lại giá trị thực tiễn cao cho doanh nghiệp và khách hàng.'),

          createTitleParagraph('1.2. Mục tiêu nghiên cứu và phạm vi đề tài', HeadingLevel.HEADING_2),
          createParagraph('Mục tiêu trọng tâm của đề tài bao gồm:'),
          createBullet('Chuẩn hóa quy trình 10 giai đoạn vòng đời phiếu sửa chữa (từ Tiếp nhận, Thẩm định, Phân công, Báo giá, Sửa chữa, Xuất kho, đến Nghiệm thu, Thu tiền và Bảo hành).'),
          createBullet('Thiết lập cơ chế Phê duyệt Báo giá 2 tầng (KTV lập ➔ Admin thẩm định Tầng 1 ➔ Khách hàng duyệt Tầng 2 trên Web/App), triệt tiêu hoàn toàn rủi ro tiêu cực báo khống giá.'),
          createBullet('Cơ chế xuất kho vật tư nguyên tử (Atomic Inventory Concurrency Lock với SELECT ... FOR UPDATE), ngăn chặn tuyệt đối tình trạng tồn kho âm.'),
          createBullet('Xây dựng ứng dụng di động React Native Expo dành cho Kỹ thuật viên hiện trường (hỗ trợ gọi điện, bản đồ chỉ đường, stepper 4 bước trực quan) và Cổng khách hàng (theo dõi đơn hàng thời gian thực, duyệt báo giá 1 chạm).'),

          createTitleParagraph('1.3. Mô hình hóa 6 Vai trò Nghiệp vụ (6 Roles Architecture)', HeadingLevel.HEADING_2),
          createParagraph('Hệ thống được thiết kế phân quyền nghiêm ngặt dựa trên vai trò (RBAC) với 6 tác nhân:'),
          createBullet('Khách Hàng (Customer): Đặt lịch dịch vụ tại nhà, theo dõi tiến độ thời gian thực, duyệt/từ chối báo giá, lưu trữ thẻ bảo hành điện tử.', '1. '),
          createBullet('Lễ Tân (Receptionist): Tiếp nhận đơn trực tiếp tại quầy hoặc thẩm định đơn đặt lịch online (Duyệt ACCEPTED hoặc Từ chối REJECTED kèm lý do).', '2. '),
          createBullet('Quản Trị Viên (Admin / Manager): Điều hành tổng thể, phân công KTV theo chuyên môn bằng danh sách trực quan, thẩm định Báo giá Tầng 1, quản trị nhân sự và KPI.', '3. '),
          createBullet('Kỹ Thuật Viên (Technician): Nhận việc hiện trường, khảo sát thiết bị, lập báo giá dự toán, chụp ảnh nhật ký sửa chữa, gửi yêu cầu xuất kho linh kiện.', '4. '),
          createBullet('Thủ Kho (Warehouse Staff): Quản lý danh mục phụ tùng, kiểm tra tồn kho, thẩm định và duyệt xuất kho nguyên tử, theo dõi thẻ kho.', '5. '),
          createBullet('Kế Toán (Accountant): Lập hóa đơn thanh toán (Invoice), ghi nhận thanh toán đa lần, quyết toán công nợ và kích hoạt quyền bàn giao máy khi thu đủ 100%.', '6. '),

          new Paragraph({ children: [new PageBreak()] }),

          // ==================== CHƯƠNG 2 ====================
          createTitleParagraph('CHƯƠNG 2: PHÂN TÍCH YÊU CẦU & ĐẶC TẢ USE CASE', HeadingLevel.HEADING_1),
          
          createTitleParagraph('2.1. Yêu cầu chức năng và phi chức năng', HeadingLevel.HEADING_2),
          createParagraph('Hệ thống đáp ứng các yêu cầu chất lượng phần mềm theo tiêu chuẩn ISO/IEC 25010:'),
          createBullet('Tính an toàn & bảo mật: Mã hóa mật khẩu một chiều bcrypt độ an toàn cao, xác thực phiên Bearer JWT 72h có cơ chế sliding session tự động làm mới.'),
          createBullet('Tính toàn vẹn dữ liệu: Sử dụng Transaction MySQL và khóa dòng cấp độ hàng (Row-level Locking) cho các thao tác tài chính và trừ kho.'),
          createBullet('Tính khả dụng & Responsive: Giao diện Web SPA tương thích mọi độ phân giải màn hình, App Mobile đa nền tảng iOS & Android giao diện tối ưu cho KTV hiện trường.'),

          createTitleParagraph('2.2. Bảng Danh mục và Mô tả Tác nhân (Actors)', HeadingLevel.HEADING_2),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(['Mã Tác Nhân', 'Tên Tác Nhân (Actor)', 'Phạm Vi Trách Nhiệm', 'Giao Diện Sử Dụng'], [18, 25, 37, 20]),
              new TableRow({ children: [cell('ACT-01'), cell('Khách Hàng (Customer)'), cell('Đặt lịch sửa chữa, duyệt báo giá, theo dõi trạng thái, nghiệm thu và phản hồi dịch vụ'), cell('Mobile App & Customer Portal')] }),
              new TableRow({ children: [cell('ACT-02'), cell('Lễ Tân (Receptionist)'), cell('Tiếp nhận đơn tại quầy, thẩm định đơn online, quản lý hồ sơ ban đầu, bàn giao thiết bị'), cell('Web Reception & Mobile App')] }),
              new TableRow({ children: [cell('ACT-03'), cell('Quản Trị Viên (Admin)'), cell('Điều hành hệ thống, phân công KTV, thẩm định báo giá tầng 1, giám sát KPI'), cell('Web Admin Dashboard & Mobile')] }),
              new TableRow({ children: [cell('ACT-04'), cell('Kỹ Thuật Viên (Technician)'), cell('Khảo sát thiết bị, lập báo giá, sửa chữa, gửi yêu cầu linh kiện, ghi nhật ký có ảnh'), cell('Mobile Field Tech App')] }),
              new TableRow({ children: [cell('ACT-05'), cell('Thủ Kho (Warehouse)'), cell('Quản lý tồn kho, duyệt xuất linh kiện cho KTV, nhập kho, kiểm kê thẻ kho'), cell('Web Inventory & Mobile App')] }),
              new TableRow({ children: [cell('ACT-06'), cell('Kế Toán (Accountant)'), cell('Lập hóa đơn quyết toán, thu tiền nhiều lần, kiểm soát công nợ, in hóa đơn'), cell('Web Billing & Mobile App')] })
            ]
          }),

          createTitleParagraph('2.3. Bảng Danh mục Use Case Tổng Thể Hệ Thống', HeadingLevel.HEADING_2),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(['Mã UC', 'Tên Use Case', 'Phân Hệ Chức Năng', 'Tác Nhân Chính'], [14, 38, 28, 20]),
              new TableRow({ children: [cell('UC01'), cell('Đăng nhập hệ thống đa vai trò'), cell('Xác thực & Bảo mật'), cell('Tất cả 6 Actors')] }),
              new TableRow({ children: [cell('UC02'), cell('Đăng ký tài khoản Khách hàng mới'), cell('Xác thực & Bảo mật'), cell('Khách Hàng')] }),
              new TableRow({ children: [cell('UC03'), cell('Khách hàng đặt lịch hẹn & gửi ảnh lỗi'), cell('Tiếp nhận & Dịch vụ'), cell('Khách Hàng')] }),
              new TableRow({ children: [cell('UC04'), cell('Lễ tân tiếp nhận đơn (ACCEPTED / REJECTED)'), cell('Tiếp nhận & Dịch vụ'), cell('Lễ Tân')] }),
              new TableRow({ children: [cell('UC05'), cell('Admin phân công KTV theo tên trực quan'), cell('Phân công công việc'), cell('Quản Trị Viên')] }),
              new TableRow({ children: [cell('UC06'), cell('KTV khảo sát lỗi & lập báo giá chi phí'), cell('Thẩm định Báo giá'), cell('Kỹ Thuật Viên')] }),
              new TableRow({ children: [cell('UC07'), cell('Admin thẩm định Báo giá Tầng 1'), cell('Thẩm định Báo giá'), cell('Quản Trị Viên')] }),
              new TableRow({ children: [cell('UC08'), cell('Khách hàng phê duyệt Báo giá Tầng 2'), cell('Thẩm định Báo giá'), cell('Khách Hàng')] }),
              new TableRow({ children: [cell('UC09'), cell('KTV ghi nhật ký sửa chữa & chụp ảnh tiến độ'), cell('Kỹ thuật hiện trường'), cell('Kỹ Thuật Viên')] }),
              new TableRow({ children: [cell('UC10'), cell('KTV lập yêu cầu cấp phát linh kiện kho'), cell('Quản lý Kho vật tư'), cell('Kỹ Thuật Viên')] }),
              new TableRow({ children: [cell('UC11'), cell('Thủ kho duyệt & xuất kho linh kiện nguyên tử'), cell('Quản lý Kho vật tư'), cell('Thủ Kho')] }),
              new TableRow({ children: [cell('UC12'), cell('KTV hoàn tất sửa chữa & nghiệm thu kỹ thuật'), cell('Kỹ thuật hiện trường'), cell('Kỹ Thuật Viên')] }),
              new TableRow({ children: [cell('UC13'), cell('Kế toán lập hóa đơn thanh toán (Invoice)'), cell('Kế toán & Thu chi'), cell('Kế toán')] }),
              new TableRow({ children: [cell('UC14'), cell('Ghi nhận thu tiền & kiểm tra công nợ'), cell('Kế toán & Thu chi'), cell('Kế toán')] }),
              new TableRow({ children: [cell('UC15'), cell('Bàn giao thiết bị & kích hoạt bảo hành'), cell('Bảo hành & Bàn giao'), cell('Lễ Tân / Kế toán')] })
            ]
          }),

          new Paragraph({ spacing: { before: 140, after: 100 } }),
          createTitleParagraph('2.4. Sơ Đồ Use Case Tổng Thể & Phân Hệ Thẩm Định Báo Giá', HeadingLevel.HEADING_2),
          createParagraph('Dưới đây là sơ đồ Use Case tổng thể mô hình hóa toàn bộ sự tương tác giữa 6 tác nhân và ranh giới hệ thống Vua Sửa Chữa (vẽ theo chuẩn UML tiêu chuẩn doanh nghiệp, sử dụng biểu tượng hình người stick-figure chính quy, loại bỏ hoàn toàn các emoji không chuẩn mực):'),
          ...insertImage('diagram_usecase_general.png', 580, 360, 'Hình 2.1: Sơ đồ Use Case tổng thể toàn hệ thống "Vua Sửa Chữa" (Chuẩn UML 2.5)'),

          createParagraph('Điểm nổi bật cốt lõi trong kiến trúc nghiệp vụ của hệ thống là phân hệ Thẩm định Báo giá 2 tầng (Two-Tier Quote Approval) được mô hình hóa chi tiết với các quan hệ «include» và «extend» trong Hình 2.2:'),
          ...insertImage('diagram_usecase_quote.png', 560, 340, 'Hình 2.2: Sơ đồ Use Case phân hệ Thẩm định Báo giá 2 Tầng (Chuẩn UML 2.5)'),

          createTitleParagraph('2.5. Các Bảng Đặc Tả Use Case Chi Tiết (Chuẩn Quốc Tế)', HeadingLevel.HEADING_2),
          createParagraph('Dưới đây là các bảng đặc tả Use Case chi tiết của các nghiệp vụ trọng yếu nhất trong hệ thống:'),

          // UC05
          createTitleParagraph('Bảng 2.1: Đặc tả Use Case UC05 — Phân công Kỹ thuật viên', HeadingLevel.HEADING_3),
          buildUseCaseTable(
            'UC05',
            'Phân công Kỹ thuật viên phụ trách sửa chữa (Assign Technician)',
            'Quản Trị Viên (Admin) / Lễ Tân (Receptionist)',
            'Phiếu sửa chữa đang ở trạng thái ACCEPTED (Lễ tân đã tiếp nhận hợp lệ).',
            'Phiếu chuyển sang trạng thái ASSIGNED; KTV nhận được thông báo phân công và thấy đơn trong danh sách.',
            '1. Admin truy cập Dashboard, chọn tab "Chờ phân công".\n2. Hệ thống tải danh sách KTV kèm họ tên, username, SĐT và số đơn hiện đang xử lý.\n3. Admin chọn một KTV phù hợp và bấm "Xác nhận phân công".\n4. Hệ thống tạo bản ghi trong bảng repair_assignments, cập nhật repair_orders sang ASSIGNED và gửi thông báo cho KTV.',
            'Nếu KTV đang bị khóa tài khoản hoặc có quá nhiều đơn tồn đọng, hệ thống hiển thị cảnh báo để Admin cân nhắc điều phối người khác.'
          ),

          new Paragraph({ spacing: { before: 140 } }),
          // UC07
          createTitleParagraph('Bảng 2.2: Đặc tả Use Case UC07 — Admin Thẩm Định Báo Giá Tầng 1', HeadingLevel.HEADING_3),
          buildUseCaseTable(
            'UC07',
            'Admin Thẩm định Báo giá Tầng 1 (Admin Review Quote)',
            'Quản Trị Viên (Admin / Manager)',
            'Phiếu sửa chữa đang ở trạng thái AWAITING_ADMIN_APPROVAL (KTV đã gửi báo giá).',
            'Báo giá được duyệt chuyển sang AWAITING_CUSTOMER_APPROVAL để khách hàng duyệt.',
            '1. Admin mở mục "Báo giá cần duyệt" trên Web hoặc Mobile.\n2. Xem chi tiết từng hạng mục: tiền công sửa chữa, danh sách linh kiện thay thế, tổng tiền.\n3. So khớp với định mức giá quy định của công ty.\n4. Admin bấm "Phê duyệt Báo giá". Hệ thống lưu admin_approval_status = APPROVED và kích hoạt thông báo gửi khách hàng.',
            'Nếu giá không hợp lệ: Admin bấm "Yêu cầu chỉnh sửa" kèm lý do. Hệ thống chuyển phiếu về ASSIGNED để KTV làm lại dự toán.'
          ),

          new Paragraph({ spacing: { before: 140 } }),
          // UC11
          createTitleParagraph('Bảng 2.3: Đặc tả Use Case UC11 — Thủ Kho Duyệt & Xuất Kho Nguyên Tử', HeadingLevel.HEADING_3),
          buildUseCaseTable(
            'UC11',
            'Thủ Kho Thẩm Định & Xuất Kho Linh Kiện (Atomic Inventory Issue)',
            'Thủ Kho (Warehouse Staff)',
            'Phiếu sửa chữa ở trạng thái WAITING_PARTS (KTV đã gửi yêu cầu cấp phát linh kiện).',
            'Linh kiện được trừ tồn kho an toàn; sinh bản ghi Thẻ kho ISSUE; phiếu tự động chuyển về IN_PROGRESS.',
            '1. Thủ kho xem danh sách yêu cầu cấp phát linh kiện từ KTV.\n2. Mở giao dịch DB Transaction có khóa dòng FOR UPDATE trên bảng inventory_items.\n3. Kiểm tra số lượng tồn: stock_quantity >= quantity_requested.\n4. Trừ tồn kho, lưu lịch sử giao dịch kho, thêm linh kiện vào chi phí phiếu sửa chữa và COMMIT.\n5. Tự động chuyển phiếu sửa chữa về lại trạng thái IN_PROGRESS để KTV sửa tiếp.',
            'Nếu số lượng tồn kho thực tế không đủ: Hệ thống ROLLBACK toàn bộ, Thủ kho từ chối yêu cầu kèm ghi chú lý do thiếu hàng để KTV xử lý.'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // ==================== CHƯƠNG 3 ====================
          createTitleParagraph('CHƯƠNG 3: THIẾT KẾ KIẾN TRÚC & MÔ HÌNH HÓA HỆ THỐNG', HeadingLevel.HEADING_1),
          
          createTitleParagraph('3.1. Kiến trúc Hệ thống Tổng thể', HeadingLevel.HEADING_2),
          createParagraph('Hệ thống "Vua Sửa Chữa" được thiết kế theo mô hình Kiến trúc 3 tầng phân tán (Three-Tier Multi-Client Architecture):'),
          createBullet('Tầng Giao diện Đa nền tảng (Presentation Layer): Gồm Web Single Page Application (React 18 + Vite) dành cho quản trị viên, lễ tân, thủ kho, kế toán; và Mobile App (React Native Expo TypeScript) dành cho KTV hiện trường và Khách hàng.'),
          createBullet('Tầng Nghiệp vụ (Business Logic & API Layer): Xây dựng trên nền Node.js / ExpressJS RESTful API, trang bị Bộ máy chuyển trạng thái hữu hạn (Finite State Machine) kiểm soát nghiêm ngặt 10 giai đoạn vòng đời phiếu sửa chữa.'),
          createBullet('Tầng Dữ liệu (Data Persistence Layer): Cơ sở dữ liệu quan hệ MySQL InnoDB hỗ trợ giao dịch ACID, khóa dòng hàng loạt (Row-level Locking) và chỉ mục tối ưu truy vấn thời gian thực.'),

          createTitleParagraph('3.2. Sơ Đồ Hoạt Động (Activity Diagrams) Các Quy Trình Trọng Yếu', HeadingLevel.HEADING_2),
          createParagraph('Quy trình 10 giai đoạn vòng đời phiếu sửa chữa phối hợp nhịp nhàng giữa 6 bộ phận nghiệp vụ được mô hình hóa chi tiết bằng sơ đồ Swimlane trong Hình 3.1:'),
          ...insertImage('diagram_activity_10stages.png', 580, 340, 'Hình 3.1: Sơ đồ hoạt động Swimlane quy trình 10 giai đoạn vòng đời phiếu sửa chữa'),

          createParagraph('Chi tiết luồng hoạt động Thẩm định Báo giá 2 tầng (KTV ➔ Admin ➔ Khách hàng) với các điểm rẽ nhánh quyết định (Decision Diamonds) được thể hiện trong Hình 3.2:'),
          ...insertImage('diagram_activity_quote_flow.png', 540, 360, 'Hình 3.2: Sơ đồ hoạt động chi tiết quy trình Thẩm định Báo giá 2 tầng'),

          createParagraph('Cơ chế Cấp phát & Xuất kho linh kiện nguyên tử chống tồn âm và giải quyết tranh chấp đồng thời (Concurrency Lock) được thể hiện trong Hình 3.3:'),
          ...insertImage('diagram_activity_parts_flow.png', 540, 360, 'Hình 3.3: Sơ đồ hoạt động quy trình Xuất kho linh kiện nguyên tử'),

          new Paragraph({ spacing: { before: 140 } }),
          createTitleParagraph('3.3. Biểu Đồ Lớp Doanh Nghiệp (Enterprise UML Class Diagram)', HeadingLevel.HEADING_2),
          createParagraph('Hình 3.4 mô tả Biểu đồ lớp (UML Class Diagram) theo đúng quy chuẩn mô hình hóa phần mềm tại các doanh nghiệp công nghệ (chuẩn OMG UML 2.5 Specification). Mỗi lớp được phân chia chính xác thành 3 ngăn: Tên lớp (kèm Stereotype), Danh mục Thuộc tính (kèm phạm vi truy cập private "-", tên thuộc tính và kiểu dữ liệu chuẩn), và Danh mục Phương thức (kèm phạm vi truy cập public "+", tham số truyền vào và kiểu trả về).'),
          ...insertImage('diagram_class_diagram.png', 590, 380, 'Hình 3.4: Biểu đồ lớp cốt lõi hệ thống (Enterprise UML Class Diagram — Chuẩn OMG 2.5)'),

          createParagraph('Bảng 3.1 tóm tắt trách nhiệm và quan hệ kết hợp của các lớp thực thể chính:'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(['Lớp Thực Thể (Class)', 'Ý Nghĩa Nghiệp Vụ', 'Phương Thức Chính (Methods)', 'Mối Quan Hệ (Relations)'], [22, 28, 25, 25]),
              new TableRow({ children: [cell('User'), cell('Tài khoản người dùng và thông tin phân quyền 6 vai trò'), cell('authenticate(), hasPermission(), changePassword()'), cell('1 ── 0..* RepairAssignment')] }),
              new TableRow({ children: [cell('Customer'), cell('Hồ sơ khách hàng, thông tin liên lạc và địa chỉ sửa chữa'), cell('registerDevice(), createBooking()'), cell('1 ── 0..* Device\n1 ── 0..* RepairOrder')] }),
              new TableRow({ children: [cell('Device'), cell('Thông tin máy móc (hãng, model, serial, lịch sử sửa)'), cell('getRepairHistory(), isWarrantyActive()'), cell('1 ── 0..* RepairOrder')] }),
              new TableRow({ children: [cell('RepairOrder'), cell('Phiếu sửa chữa trung tâm (Aggregate Root 10 trạng thái)'), cell('transitionTo(), assignTechnician(), calculateTotals()'), cell('1 ◆── 1..* StatusHistory\n1 ◆── 0..* Quote')] }),
              new TableRow({ children: [cell('Quote & QuoteItem'), cell('Báo giá dự toán và danh mục công thợ + vật tư thay thế'), cell('approveByAdmin(), approveByCustomer()'), cell('Quote 1 ◆── 1..* QuoteItem')] }),
              new TableRow({ children: [cell('RepairLog'), cell('Nhật ký tiến độ sửa chữa kèm hình ảnh trước/sau sửa'), cell('attachImage(url)'), cell('RepairOrder 1 ◆── 0..* RepairLog')] }),
              new TableRow({ children: [cell('PartsRequest'), cell('Yêu cầu cấp phát linh kiện kho và phê duyệt xuất kho'), cell('issueAtomic(), reject()'), cell('1 ◆── 1..* RequestItem')] }),
              new TableRow({ children: [cell('InventoryItem'), cell('Mặt hàng linh kiện kho, số lượng tồn kho, đơn giá bán'), cell('deductStock(), isUnderMinStock()'), cell('1 ◆── 0..* Transaction')] }),
              new TableRow({ children: [cell('Invoice & Payment'), cell('Hóa đơn quyết toán tài chính và các đợt thanh toán'), cell('generatePdf(), markPaid(), recordReceipt()'), cell('RepairOrder 1 ── 0..1 Invoice')] })
            ]
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // ==================== CHƯƠNG 4 ====================
          createTitleParagraph('CHƯƠNG 4: THIẾT KẾ & HIỆN THỰC GIAO DIỆN HỆ THỐNG', HeadingLevel.HEADING_1),
          
          createTitleParagraph('4.1. Hiện Thực Giao Diện Phân Hệ Web Application (Hình Ảnh Thực Tế)', HeadingLevel.HEADING_2),
          createParagraph('Hệ thống Web Application "Vua Sửa Chữa" được xây dựng bằng React 18, bố cục chuẩn SaaS với đầy đủ các màn hình vận hành phục vụ các vai trò Admin, Lễ tân, Thủ kho, Kế toán và Khách hàng:'),

          createParagraph('1. Trang Chủ / Landing Page & Hộp Thoại Đăng Nhập:'),
          ...insertImage('web_landing_login.png', 560, 310, 'Hình 4.1: Trang Landing Page & Hộp thoại Đăng nhập hệ thống Vua Sửa Chữa'),

          createParagraph('2. Dashboard Quản Trị Trung Tâm (Admin Dashboard):'),
          ...insertImage('web_admin_dashboard.png', 560, 310, 'Hình 4.2: Dashboard Điều hành trung tâm dành cho Quản trị viên (Admin)'),

          createParagraph('3. Quản Lý Danh Sách Phiếu Sửa Chữa & Bộ Lọc Nhanh:'),
          ...insertImage('web_repairs_list.png', 560, 310, 'Hình 4.3: Giao diện Quản lý danh sách phiếu sửa chữa đa trạng thái'),

          createParagraph('4. Chi Tiết Phiếu Sửa Chữa, Thẩm Định Báo Giá & Nhật Ký:'),
          ...insertImage('web_repair_detail.png', 560, 310, 'Hình 4.4: Chi tiết phiếu sửa chữa, thẩm định báo giá & nhật ký tiến độ'),

          createParagraph('5. Quản Lý Kho Vật Tư, Cảnh Báo Tồn Kho & Cấp Phát:'),
          ...insertImage('web_inventory.png', 560, 310, 'Hình 4.5: Phân hệ Quản lý Kho vật tư, cảnh báo tồn kho & cấp phát linh kiện'),

          createParagraph('6. Quản Trị Khách Hàng & Hồ Sơ Thiết Bị Điện Máy:'),
          ...insertImage('web_customers.png', 560, 310, 'Hình 4.6: Quản trị danh sách khách hàng và hồ sơ thiết bị gia đình'),

          createParagraph('7. Cổng Dịch Vụ Khách Hàng Trực Tuyến (Customer Portal):'),
          ...insertImage('web_customer_portal.png', 560, 310, 'Hình 4.7: Cổng Dịch vụ Khách hàng trực tuyến (Customer Portal)'),

          createParagraph('8. Mẫu Hóa Đơn Thanh Toán Chuẩn Doanh Nghiệp & In PDF:'),
          ...insertImage('web_invoice_print.png', 500, 380, 'Hình 4.8: Mẫu Hóa đơn thanh toán chuẩn doanh nghiệp & In PDF'),

          createParagraph('9. Báo Cáo Vận Hành & Phân Tích KPI Doanh Thu / Trạng Thái Đơn:'),
          ...insertImage('web_reports.png', 560, 310, 'Hình 4.9: Phân hệ Báo cáo vận hành, phân tích KPI doanh thu & công nợ'),

          new Paragraph({ spacing: { before: 140 } }),
          createTitleParagraph('4.2. Hiện Thực Giao Diện Phân Hệ Mobile App (Khung Máy iPhone 15 Pro)', HeadingLevel.HEADING_2),
          createParagraph('Phân hệ Mobile App "Vua Sửa Chữa" được xây dựng bằng React Native Expo TypeScript, tối ưu hóa giao diện di động cho cả Kỹ thuật viên hiện trường, Khách hàng, Lễ tân, Thủ kho và Kế toán:'),

          createParagraph('1. Màn Hình Đăng Nhập Di Động:'),
          ...insertImage('mobile_login.png', 290, 480, 'Hình 4.10: Màn hình Đăng nhập ứng dụng Vua Sửa Chữa trên Mobile'),

          createParagraph('2. Màn Hình Đăng Ký Tài Khoản Khách Hàng Mới:'),
          ...insertImage('mobile_register.png', 290, 480, 'Hình 4.11: Màn hình Đăng ký tài khoản Khách hàng mới trên Mobile'),

          createParagraph('3. Dashboard Admin Trên Mobile & Phân Công KTV Theo Tên Trực Quan:'),
          ...insertImage('mobile_admin_dashboard.png', 290, 480, 'Hình 4.12: Dashboard Admin trên Mobile & Phân công KTV theo tên trực quan'),

          createParagraph('4. Danh Sách Đơn Của KTV (2 Tab: Đơn của tôi & Tất cả đơn):'),
          ...insertImage('mobile_tech_orders.png', 290, 480, 'Hình 4.13: Danh sách đơn nhận việc của KTV với 2 tab phân loại rõ ràng'),

          createParagraph('5. Chi Tiết Đơn KTV Với Stepper 4 Bước & Nút Gọi/Chỉ Đường:'),
          ...insertImage('mobile_tech_order_detail.png', 290, 480, 'Hình 4.14: Chi tiết công việc KTV hiện trường với Stepper 4 bước & Gọi/Chỉ đường Maps'),

          createParagraph('6. Màn Hình KTV Lập Dự Toán Báo Giá Trên Mobile:'),
          ...insertImage('mobile_quote_builder.png', 290, 480, 'Hình 4.15: Màn hình KTV Lập dự toán báo giá chi phí gửi Admin thẩm định'),

          createParagraph('7. Màn Hình KTV Chụp Ảnh Nhật Ký Trước & Sau Khi Sửa Chữa:'),
          ...insertImage('mobile_camera_log.png', 290, 480, 'Hình 4.16: Màn hình KTV Chụp ảnh nhật ký trước/sau sửa chữa & ghi chú kỹ thuật'),

          createParagraph('8. Cổng Dịch Vụ Khách Hàng Trên Mobile & Danh Mục Thiết Bị:'),
          ...insertImage('mobile_customer_portal.png', 290, 480, 'Hình 4.17: Cổng Dịch vụ Khách hàng trên Mobile & Danh mục thiết bị hỗ trợ'),

          createParagraph('9. Màn Hình Khách Hàng Đặt Lịch Sửa Chữa Tại Nhà:'),
          ...insertImage('mobile_create_booking.png', 290, 480, 'Hình 4.18: Màn hình Khách hàng Đặt lịch sửa chữa tại nhà kèm ảnh mô tả hư hỏng'),

          createParagraph('10. Màn Hình Theo Dõi Tiến Trình 10 Giai Đoạn Thời Gian Thực:'),
          ...insertImage('mobile_order_tracking.png', 290, 480, 'Hình 4.19: Màn hình Khách hàng Theo dõi tiến trình 10 giai đoạn thời gian thực'),

          createParagraph('11. Phân Hệ Thủ Kho Thẩm Định & Duyệt Xuất Vật Tư Trên Mobile:'),
          ...insertImage('mobile_warehouse_dashboard.png', 290, 480, 'Hình 4.20: Phân hệ Thủ kho thẩm định duyệt xuất linh kiện cho KTV trên Mobile'),

          createParagraph('12. Phân Hệ Kế Toán Thu Tiền & Quyết Toán Hóa Đơn Trên Mobile:'),
          ...insertImage('mobile_accountant_dashboard.png', 290, 480, 'Hình 4.21: Phân hệ Kế toán thu tiền & quyết toán hóa đơn trên Mobile'),

          new Paragraph({ children: [new PageBreak()] }),

          // ==================== CHƯƠNG 5 ====================
          createTitleParagraph('CHƯƠNG 5: KIỂM THỬ HỆ THỐNG, ĐÁNH GIÁ & KẾT LUẬN', HeadingLevel.HEADING_1),
          
          createTitleParagraph('5.1. Chiến Lược Kiểm Thử Phần Mềm', HeadingLevel.HEADING_2),
          createParagraph('Để bảo đảm hệ thống vận hành ổn định trong môi trường thực tế, nhóm nghiên cứu đã áp dụng mô hình kim tự tháp kiểm thử phần mềm đa tầng:'),
          createBullet('Kiểm thử đơn vị (Unit Tests): Viết bằng bộ kiểm thử tích hợp sẵn của Node.js (node:test, node:assert), kiểm thử độc lập từng service: state machine, xác thực token, mã hóa bcrypt, tính toán công nợ và logic hạch toán kho.'),
          createBullet('Kiểm thử tích hợp liên thông (Integration Tests): 6 kịch bản kiểm thử luồng nghiệp vụ trên cơ sở dữ liệu thật: luồng tiếp nhận, luồng 2 tầng duyệt báo giá, luồng xuất kho nguyên tử, luồng hóa đơn & thanh toán đa lần, luồng bảo hành.'),
          createBullet('Kiểm thử liên thông Web ↔ Mobile (Mobile E2E Testing): Mô phỏng trọn vẹn 12 bước nghiệp vụ từ lúc Khách hàng đặt lịch trên Mobile đến khi KTV nhận đơn, lập báo giá, Admin duyệt, Kho cấp phát và Kế toán thu tiền.'),
          createBullet('Kiểm thử An toàn Dữ liệu (Backup & Restore Verification): Kiểm chứng tự động kịch bản sao lưu và phục hồi cơ sở dữ liệu toàn vẹn.'),

          createTitleParagraph('5.2. Bảng Tổng Hợp Kết Quả Kiểm Thử', HeadingLevel.HEADING_2),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(['Bộ Kiểm Thử (Test Suite)', 'Số Lượng Test Cases', 'Kết Quả Đạt Được', 'Tỷ Lệ Thành Công'], [35, 25, 20, 20]),
              new TableRow({ children: [cell('Backend Core Unit Tests'), cell('63 kịch bản'), cell('63/63 PASS'), cell('100%')] }),
              new TableRow({ children: [cell('Repair Orders Integration'), cell('15 kịch bản tích hợp'), cell('15/15 PASS'), cell('100%')] }),
              new TableRow({ children: [cell('Two-tier Quote Approval Suite'), cell('11 bước nghiệp vụ'), cell('11/11 PASS'), cell('100%')] }),
              new TableRow({ children: [cell('Atomic Inventory Suite'), cell('10 bước nghiệp vụ'), cell('10/10 PASS'), cell('100%')] }),
              new TableRow({ children: [cell('Billing & Warranty Suite'), cell('13 bước nghiệp vụ'), cell('13/13 PASS'), cell('100%')] }),
              new TableRow({ children: [cell('Full Lifecycle E2E Delivery'), cell('8 giai đoạn chuẩn'), cell('PASS'), cell('100%')] }),
              new TableRow({ children: [cell('Mobile ↔ Web Integration E2E'), cell('12 bước liên thông'), cell('12/12 PASS'), cell('100%')] }),
              new TableRow({ children: [cell('Database Backup & Restore'), cell('1 quy trình phục hồi'), cell('PASS'), cell('100%')] }),
              new TableRow({ children: [cell('Frontend Static Build (Vite)'), cell('Toàn bộ mã nguồn Web'), cell('0 Lỗi (Build thành công)'), cell('100%')] }),
              new TableRow({ children: [cell('Mobile TypeScript Typecheck'), cell('Toàn bộ mã nguồn Expo'), cell('0 Lỗi (tsc --noEmit)'), cell('100%')] })
            ]
          }),

          createTitleParagraph('5.3. Đánh Giá Ưu Điểm Nổi Bật Của Hệ Thống', HeadingLevel.HEADING_2),
          createBullet('Tính minh bạch và chống tiêu cực: Cơ chế duyệt báo giá 2 tầng bảo vệ quyền lợi tối đa cho khách hàng, ngăn chặn việc thợ nâng giá khống.', '✓ '),
          createBullet('Quản lý kho an toàn tuyệt đối: Khóa dòng nguyên tử FOR UPDATE loại bỏ hoàn toàn nguy cơ tranh chấp dữ liệu và tình trạng tồn kho âm.', '✓ '),
          createBullet('Trải nghiệm người dùng vượt trội: Giao diện Web hiện đại chuẩn SaaS, App Mobile dành cho KTV có stepper 4 bước trực quan, tích hợp bản đồ chỉ đường và cuộc gọi 1-chạm.', '✓ '),
          createBullet('Tài liệu hóa và độ hoàn thiện cao: Đầy đủ thông số API (OpenAPI spec), kiến trúc CSDL quan hệ chuẩn hóa và bộ kiểm thử tự động hóa 100%.', '✓ '),

          createTitleParagraph('5.4. Hạn Chế Hiện Tại & Hướng Phát Triển Tương Lai', HeadingLevel.HEADING_2),
          createParagraph('Bên cạnh những kết quả nổi bật, hệ thống vẫn còn một số điểm có thể mở rộng nâng cấp trong các giai đoạn tiếp theo:'),
          createBullet('Tích hợp trí tuệ nhân tạo (AI Computer Vision): Hỗ trợ nhận diện model thiết bị và tự động gợi ý mã lỗi, nguyên nhân hư hỏng dựa trên hình ảnh sự cố do khách hàng tải lên.'),
          createBullet('Tích hợp Cổng thanh toán trực tuyến: Kết nối trực tiếp với VNPAY, MoMo, ZaloPay để khách hàng có thể thanh toán tiền đặt cọc hoặc quyết toán hóa đơn ngay trên App.'),
          createBullet('Bản đồ định vị KTV thời gian thực (Live GPS Tracking): Cho phép khách hàng theo dõi vị trí xe di chuyển của KTV khi đến sửa chữa tại nhà.'),

          new Paragraph({ spacing: { before: 200 } }),
          createTitleParagraph('TÀI LIỆU THAM KHẢO', HeadingLevel.HEADING_1),
          createParagraph('[1] Roger S. Pressman, Bruce R. Maxim, "Software Engineering: A Practitioner\'s Approach", 9th Edition, McGraw-Hill, 2020.'),
          createParagraph('[2] Martin Fowler, "Patterns of Enterprise Application Architecture", Addison-Wesley Professional, 2002.'),
          createParagraph('[3] Robert C. Martin, "Clean Architecture: A Craftsman\'s Guide to Software Structure and Design", Prentice Hall, 2017.'),
          createParagraph('[4] Object Management Group, "OMG Unified Modeling Language (OMG UML) Version 2.5.1", https://www.omg.org/spec/UML/.'),
          createParagraph('[5] React Documentation, "Building Modern User Interfaces with React 18", https://react.dev/.'),
          createParagraph('[6] Expo & React Native Documentation, "Universal Native Apps with Expo", https://docs.expo.dev/.'),
          createParagraph('[7] MySQL Reference Manual, "InnoDB Locking and Transaction Model", Oracle Corporation, 2026.')
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_FILE, buffer);
  console.log(`\n🎉 MASTER THESIS WORD DOCUMENT GENERATED SUCCESSFULLY!`);
  console.log(`Path: ${OUTPUT_FILE}`);
  console.log(`Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}

generateDocx().catch(err => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
